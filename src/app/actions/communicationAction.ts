'use server'

import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUserId, getAuthenticatedUserContext } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'

function getServiceSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return null
    return createClient(url, key)
}

/**
 * Busca avisos ativos (dentro da validade ou sem validade definida)
 */
export async function getActiveNoticesAction() {
    try {
        const supabase = getServiceSupabase()
        if (!supabase) throw new Error('Database indisponível')

        const now = new Date().toISOString()
        
        const { data, error } = await supabase
            .from('operational_notices')
            .select(`
                *, 
                users!operational_notices_created_by_fkey(name),
                notice_reactions(emoji, user_id),
                notice_responses(id)
            `)
            .or(`valid_until.is.null,valid_until.gt.${now}`)
            .order('priority', { ascending: false }) // Urgente > Importante > Normal
            .order('created_at', { ascending: false })

        if (error) throw error

        // Mapear p/ facilitar no front: adicionar contagens
        const mappedData = data.map(n => ({
            ...n,
            reaction_count: n.notice_reactions?.length || 0,
            response_count: n.notice_responses?.length || 0,
            // Agrupar reações por emoji p/ sumário rápido se necessário
            reaction_summary: (n.notice_reactions || []).reduce((acc: any, r: any) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1
                return acc
            }, {})
        }))

        return { success: true, data: mappedData }
    } catch (err: any) {
        console.error('[CommunicationAction] Erro ao buscar avisos:', err.message)
        return { success: false, error: err.message }
    }
}


/**
 * Adiciona um comentário contextual a uma tarefa/sessão/rotina
 */
export async function addTaskCommentAction(params: {
    referenceId: string,
    referenceType: 'session' | 'routine' | 'task',
    message: string,
    type: 'cobranca' | 'orientacao' | 'duvida' | 'justificativa' | 'resposta'
}) {
    try {
        const authId = await getAuthenticatedUserId()
        if (!authId) throw new Error('Não autenticado')

        const supabase = getServiceSupabase()
        if (!supabase) throw new Error('Database indisponível')

        const { error } = await supabase
            .from('task_comments')
            .insert([{
                reference_id: params.referenceId,
                reference_type: params.referenceType,
                user_id: authId,
                message: params.message,
                type: params.type
            }])

        if (error) throw error

        console.log(`[ACTION] Comment added | Ref: ${params.referenceId} | Type: ${params.type} | User: ${authId}`)
        
        // Revalidar dashboard e checklist para atualizar badges/listas
        revalidatePath('/dashboard')
        revalidatePath(`/dashboard/checklist/execute/${params.referenceId}`)

        return { success: true }
    } catch (err: any) {
        console.error('[CommunicationAction] Erro ao adicionar comentário:', err.message)
        return { success: false, error: err.message }
    }
}

/**
 * Busca comentários de uma referência específica
 */
export async function getTaskCommentsAction(referenceId: string) {
    try {
        if (referenceId === 'demo-session') {
            return {
                success: true,
                data: [
                    {
                        id: 'c1',
                        message: 'Ficou faltando a foto da alface?',
                        type: 'cobranca',
                        created_at: new Date(Date.now() - 3600000).toISOString(),
                        users: { name: 'Gerente', role: 'manager' }
                    },
                    {
                        id: 'c2',
                        message: 'Estou providenciando agora, a câmera falhou.',
                        type: 'resposta',
                        created_at: new Date(Date.now() - 1800000).toISOString(),
                        users: { name: 'Operador', role: 'operator' }
                    }
                ]
            }
        }

        const supabase = getServiceSupabase()
        if (!supabase) throw new Error('Database indisponível')

        const { data, error } = await supabase
            .from('task_comments')
            .select('*, users(name, role)')
            .eq('reference_id', referenceId)
            .order('created_at', { ascending: true })

        if (error) throw error

        return { success: true, data }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

/**
 * Busca aniversariantes da semana (para o Mural)
 */
export async function getWeeklyBirthdaysAction() {
    try {
        const supabase = getServiceSupabase()
        if (!supabase) throw new Error('Database indisponível')

        // Buscamos todos os usuários ativos
        const { data: users, error } = await supabase
            .from('users')
            .select('id, name, birth_day, birth_month, avatar_url')
            .eq('active', true)
            .not('birth_day', 'is', null)
            .not('birth_month', 'is', null)

        if (error) throw error

        const now = new Date()
        const currentMonth = now.getMonth() + 1
        const currentDay = now.getDate()

        // Filtragem simples: Aniversariantes do dia ou próximos 7 dias
        // Nota: Para a semana operacional do sistema, poderíamos ser mais precisos, 
        // mas para o mural "Próximos aniversariantes" ou "Desta semana" costuma ser 7 dias.
        const weekly = users.filter(u => {
            if (!u.birth_day || !u.birth_month) return false
            
            // Caso simples: mesmo mês
            if (u.birth_month === currentMonth) {
                return u.birth_day >= currentDay && u.birth_day <= currentDay + 7
            }
            
            // Caso virada de mês (ex: final de Abril para Maio)
            const isNextMonth = (u.birth_month === currentMonth + 1) || (currentMonth === 12 && u.birth_month === 1)
            if (isNextMonth) {
                const daysInMonth = new Date(now.getFullYear(), currentMonth, 0).getDate()
                const daysLeft = daysInMonth - currentDay
                return (u.birth_day + daysLeft) <= 7
            }

            return false
        })

        return { 
            success: true, 
            data: weekly.map(u => ({
                id: u.id,
                name: u.name,
                date: `${String(u.birth_day).padStart(2, '0')}/${String(u.birth_month).padStart(2, '0')}`,
                avatarUrl: u.avatar_url
            }))
        }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

/**
 * Cria um novo aviso operacional
 */
export async function createNoticeAction(params: {
    title: string,
    message: string,
    type: 'operacional' | 'item_em_falta' | 'promocao' | 'mudanca_de_turno' | 'comunicado_geral',
    priority: 'normal' | 'importante' | 'urgente',
    validUntil?: string | null
}) {
    try {
        const authId = await getAuthenticatedUserId()
        if (!authId) throw new Error('Não autenticado')

        const supabase = getServiceSupabase()
        if (!supabase) throw new Error('Database indisponível')

        const { error } = await supabase
            .from('operational_notices')
            .insert([{
                title: params.title,
                message: params.message,
                type: params.type,
                priority: params.priority,
                valid_until: params.validUntil || null,
                created_by: authId
            }])

        if (error) throw error

        revalidatePath('/dashboard')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

/**
 * Remove um aviso operacional
 */
export async function deleteNoticeAction(id: string) {
    try {
        const supabase = getServiceSupabase()
        if (!supabase) throw new Error('Database indisponível')

        const { error } = await supabase
            .from('operational_notices')
            .delete()
            .eq('id', id)

        if (error) throw error

        revalidatePath('/dashboard')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

/**
 * Adiciona ou remove uma reação a um aviso
 */
export async function toggleNoticeReactionAction(noticeId: string, emoji: string) {
    try {
        const authId = await getAuthenticatedUserId()
        if (!authId) throw new Error('Não autenticado')

        const supabase = getServiceSupabase()
        if (!supabase) throw new Error('Database indisponível')

        // Verificar se já existe QUALQUER reação deste usuário neste aviso
        const { data: existing } = await supabase
            .from('notice_reactions')
            .select('id, emoji')
            .eq('notice_id', noticeId)
            .eq('user_id', authId)
            .single()

        if (existing) {
            // Sempre remover a anterior
            const { error: delError } = await supabase
                .from('notice_reactions')
                .delete()
                .eq('id', existing.id)
            
            if (delError) throw delError

            // Se for um emoji DIFERENTE, inserir o novo
            if (existing.emoji !== emoji) {
                const { error: insError } = await supabase
                    .from('notice_reactions')
                    .insert([{
                        notice_id: noticeId,
                        user_id: authId,
                        emoji: emoji
                    }])
                if (insError) throw insError
            }
        } else {
            // Adicionar nova
            const { error } = await supabase
                .from('notice_reactions')
                .insert([{
                    notice_id: noticeId,
                    user_id: authId,
                    emoji: emoji
                }])
            if (error) throw error
        }


        revalidatePath('/dashboard')
        return { success: true }
    } catch (err: any) {
        console.error('[CommunicationAction] Erro ao alternar reação:', err.message)
        return { success: false, error: err.message }
    }
}

/**
 * Adiciona uma resposta a um aviso
 */
export async function addNoticeResponseAction(noticeId: string, message: string) {
    try {
        const authId = await getAuthenticatedUserId()
        if (!authId) throw new Error('Não autenticado')

        const supabase = getServiceSupabase()
        if (!supabase) throw new Error('Database indisponível')

        const { error } = await supabase
            .from('notice_responses')
            .insert([{
                notice_id: noticeId,
                user_id: authId,
                message: message
            }])

        if (error) throw error

        revalidatePath('/dashboard')
        return { success: true }
    } catch (err: any) {
        console.error('[CommunicationAction] Erro ao adicionar resposta:', err.message)
        return { success: false, error: err.message }
    }
}

/**
 * Busca detalhes de interação (reações e respostas) de um aviso
 */
export async function getNoticeInteractionsAction(noticeId: string) {
    try {
        const supabase = getServiceSupabase()
        if (!supabase) throw new Error('Database indisponível')

        // Reações
        const { data: reactions, error: rError } = await supabase
            .from('notice_reactions')
            .select('emoji, user_id, users(name)')
            .eq('notice_id', noticeId)

        if (rError) throw rError

        // Respostas
        const { data: responses, error: resError } = await supabase
            .from('notice_responses')
            .select('*, users(name, role)')
            .eq('notice_id', noticeId)
            .order('created_at', { ascending: true })

        if (resError) throw resError

        return { 
            success: true, 
            data: {
                reactions: reactions || [],
                responses: responses || []
            }
        }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

