'use server'

import { createClient } from '@supabase/supabase-js'
import { getCycleAnchorDate } from '@/modules/count/helpers'
import { isTestOperator } from './routinesAction'
import { getAccessibleCountScope, getServerAuthContext } from '@/lib/server-auth-context'

import { CountItem } from '@/modules/count/types'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type InitCountSessionResult = {
    sessionId?: string | null
    sessionStatus?: string
    groupName?: string
    items?: CountItem[]
    dbCounts?: Record<string, string>
    dbZeroed?: Record<string, boolean>
    blocked?: string
    error?: string
}

export async function initCountSessionAction(routineId: string, groupId: string, _passedUserId: string): Promise<InitCountSessionResult> {
    try {
        const user = await getServerAuthContext()
        const userId = user.id
        const { data: userData } = await supabase.from('users').select('name, role, primary_group_id').eq('id', userId).single()
        const scope = await getAccessibleCountScope()
        const { data: group } = await supabase.from('groups').select('name, macro_sector').eq('id', groupId).single()

        const isKitchenGroup = group?.macro_sector === 'Cozinha Central'
        
        // ── VALIDAÇÃO DE ESCOPO ───────────────────────────────────────
        if (scope.type === 'restricted') {
            return { blocked: 'Seu usuário não possui permissão de acesso a rotinas operacionais.' }
        }
        if (scope.type === 'kitchen' && !isKitchenGroup) {
            return { blocked: 'Seu acesso é restrito a rotinas da Cozinha Central.' }
        }
        if (scope.type === 'store' && isKitchenGroup) {
            return { blocked: 'Acesso negado: Este setor pertence à Cozinha Central.' }
        }
        // Para lojas, verificar se o grupo é da área do usuário (se não for gerente)
        const isManager = userData?.role === 'admin' || userData?.role === 'manager'
        const isMyArea = userData?.primary_group_id === groupId

        if (scope.type === 'store' && !isManager && !isMyArea) {
            return { blocked: 'Você não tem permissão para realizar contagens fora da sua área designada.' }
        }

        const { data: routineRow } = await supabase
            .from('routines')
            .select('snapshot_started_at')
            .eq('id', routineId)
            .single()

        const cycleStart = getCycleAnchorDate(routineRow?.snapshot_started_at)

        const { data: existingSession, error: fetchErr } = await supabase
            .from('count_sessions')
            .select('id, status, user_id, execution_id, users:count_sessions_user_id_fkey(name)')
            .eq('routine_id', routineId)
            .eq('group_id', groupId)
            .neq('status', 'completed')
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (existingSession) {
            if (existingSession.status === 'completed' && scope.type !== 'kitchen') {
                return { blocked: 'Este grupo já foi concluído hoje e não pode mais ser editado.' }
            }
            if (existingSession.status === 'in_progress' && existingSession.user_id !== userId) {
                const uName = (existingSession.users as any)?.name || 'Outro usuário'
                return { blocked: `Este grupo está em andamento por ${uName}. Contagem paralela não é permitida.` }
            }
        }

        let sessionId = existingSession?.id
        const sessionStatus = existingSession?.status || 'in_progress'

        // Puxa a execução ativa
        const { data: exec } = await supabase.from('routine_executions').select('id').eq('routine_id', routineId).eq('status', 'active').maybeSingle()

        if (!existingSession) {
            const { data: newSession, error: insErr } = await supabase.from('count_sessions').insert([{
                routine_id: routineId,
                group_id: groupId,
                user_id: userId,
                status: 'in_progress',
                started_at: new Date().toISOString(),
                execution_id: exec?.id || null
            }]).select('id').single()
            if (insErr) throw insErr
            if (newSession) sessionId = newSession.id
        } else {
            // Se a sessão já existia (ex: operador abriu antes de o gerente iniciar ciclo),
            // amarra ela obrigatoriamente na execução oficial gerada agora
            if (exec?.id && existingSession.execution_id !== exec.id) {
                await supabase.from('count_sessions').update({ execution_id: exec.id }).eq('id', sessionId)
            }
        }

        const { data: items } = await supabase.from('items').select('id, name, unit, unit_observation, min_expected, max_expected, image_url').eq('group_id', groupId).eq('active', true).order('name', { ascending: true })

        const dbCounts: Record<string, string> = {}
        const dbZeroed: Record<string, boolean> = {}
        if (sessionId) {
            const { data: dbItems } = await supabase.from('count_session_items').select('item_id, counted_quantity, is_zeroed').eq('session_id', sessionId)
            if (dbItems) {
                dbItems.forEach(d => {
                    if (d.counted_quantity !== null && d.counted_quantity !== undefined) {
                        dbCounts[d.item_id] = d.counted_quantity.toString()
                    }
                    if (d.is_zeroed) {
                        dbZeroed[d.item_id] = true
                    }
                })
            }
        }

        return {
            sessionId,
            sessionStatus,
            groupName: group?.name || '',
            items: items || [],
            dbCounts,
            dbZeroed
        }
    } catch (e: any) {
        return { error: e.message || 'Erro ao inicializar sessão' }
    }
}

export async function syncCountSessionAction(
    sessionId: string, 
    currentCounts: Record<string, string>, 
    complete: boolean = false, 
    zeroedMap: Record<string, boolean> = {}
): Promise<{ success?: boolean, error?: string, savedCount?: number }> {
    console.log(`[CountAction] Iniciando sync para sessão ${sessionId}. Complete: ${complete}`);
    
    try {
        const userContext = await getServerAuthContext()
        const scope = await getAccessibleCountScope()
        
        // 0. Validar posse da sessão
        const { data: sessionOwner } = await supabase
            .from('count_sessions')
            .select('user_id, unit_id, groups(macro_sector)')
            .eq('id', sessionId)
            .single()

        if (!sessionOwner) throw new Error('Sessão não encontrada.')
        
        const isOwner = sessionOwner.user_id === userContext.id
        const isAdmin = userContext.role === 'admin'
        const isKitchen = (userContext.role === 'kitchen' || userContext.groups?.macro_sector === 'Cozinha Central') && (sessionOwner.groups as any)?.macro_sector === 'Cozinha Central'
        
        if (!isOwner && !isAdmin && !isKitchen) {
            throw new Error('Acesso negado: Você não é o dono desta sessão e não possui privilégios de gestão.')
        }

        // 1. Upsert dos dados atuais
        const upserts = Object.keys(currentCounts).map(itemId => {
            const qty = currentCounts[itemId]
            return {
                session_id: sessionId,
                item_id: itemId,
                counted_quantity: qty === '' ? null : parseFloat(qty.replace(',', '.')),
                is_zeroed: !!zeroedMap[itemId]
            }
        })

        if (upserts.length > 0) {
            const { error: upsErr } = await supabase.from('count_session_items').upsert(upserts, { onConflict: 'session_id,item_id' })
            if (upsErr) {
                console.error(`[CountAction] Erro no Upsert: ${upsErr.message}`, { sessionId, upsertsCount: upserts.length });
                return { error: `Erro ao salvar itens: ${upsErr.message}` }
            }
        }

        // 2. Verificação de Consistência (SÓ SE FOR FINALIZAR)
        if (complete) {
            console.log(`[CountAction] Validando consistência para finalização da sessão ${sessionId}`);
            
            // Busca a sessão para saber o group_id
            const { data: sessData, error: sessErr } = await supabase.from('count_sessions').select('group_id, routine_id, user_id').eq('id', sessionId).single()
            if (sessErr || !sessData) {
                console.error(`[CountAction] Erro ao buscar sessão: ${sessErr?.message}`);
                return { error: 'Não foi possível validar a sessão para finalização.' }
            }

            const groupId = sessData.group_id
            
            // Busca itens ativos do grupo
            const { data: activeItems, error: itemsErr } = await supabase.from('items').select('id, name').eq('group_id', groupId).eq('active', true)
            if (itemsErr) return { error: `Erro ao buscar itens do grupo: ${itemsErr.message}` }

            // Busca o que já foi salvo no banco (incluindo o upsert que acabamos de fazer)
            const { data: savedItems, error: savedErr } = await supabase.from('count_session_items').select('item_id, counted_quantity, is_zeroed').eq('session_id', sessionId)
            if (savedErr) return { error: `Erro ao conferir itens salvos: ${savedErr.message}` }

            const savedIds = new Set(savedItems.filter(si => si.counted_quantity !== null || si.is_zeroed).map(si => si.item_id))
            const missingItems = activeItems.filter(ai => !savedIds.has(ai.id))

            if (missingItems.length > 0) {
                console.warn(`[CountAction] Bloqueio de finalização: ${missingItems.length} itens faltantes na sessão ${sessionId}`);
                const missingNames = missingItems.slice(0, 3).map(m => m.name).join(', ')
                return { 
                    error: `Inconsistência: Faltam ${missingItems.length} itens para completar este grupo (${missingNames}${missingItems.length > 3 ? '...' : ''}). Por favor, revise a contagem.` 
                }
            }

            console.log(`[CountAction] Consistência OK para sessão ${sessionId}. ${activeItems.length} itens validados.`);
        }

        const payload: any = { updated_at: new Date().toISOString() }
        if (complete) {
            payload.status = 'completed'
            payload.completed_at = new Date().toISOString()
        }

        const { error: updErr } = await supabase.from('count_sessions').update(payload).eq('id', sessionId)
        if (updErr) {
            console.error(`[CountAction] Erro ao atualizar status da sessão ${sessionId}: ${updErr.message}`);
            return { error: `Erro ao atualizar status: ${updErr.message}` }
        }

        // --- GAMIFICAÇÃO (Camada Secundária e Resiliente) ---
        if (complete) {
            // Rodamos a gamificação de forma protegida
            // Usamos timeout manual para não deixar a action pendurada se a gamificação travar
            const gamificationPromise = (async () => {
                try {
                    const { data: sess } = await supabase
                        .from('count_sessions')
                        .select('user_id, routine_id')
                        .eq('id', sessionId)
                        .single()

                    if (sess?.user_id) {
                        const { recordPointsAction, recordSealingEventAction, checkAndRewardRoutineCompletionAction } = await import('./gamificationAction')
                        
                        // 1. Pontua conclusão de grupo (+50)
                        await recordPointsAction(
                            sess.user_id,
                            'count_group_completion',
                            sessionId,
                            50,
                            'Setor conferido com sucesso.'
                        )

                        // 2. VD-03: Sessão fechada sem abandono
                        await recordSealingEventAction(sess.user_id, 'session_clean_close', sessionId)

                        // 3. Verifica completude da rotina
                        const routineReward = await checkAndRewardRoutineCompletionAction(sessionId)

                        // 4. VD-04: Rotina sem ruptura
                        if (routineReward.success && !routineReward.duplicated && sess.routine_id) {
                            const { data: completedSessionIds } = await supabase
                                .from('count_sessions')
                                .select('id')
                                .eq('routine_id', sess.routine_id)
                                .eq('status', 'completed')

                            const ids = completedSessionIds?.map(s => s.id) || []

                            if (ids.length > 0) {
                                const { data: zeroedInRoutine } = await supabase
                                    .from('count_session_items')
                                    .select('id')
                                    .eq('is_zeroed', true)
                                    .in('session_id', ids)
                                    .limit(1)

                                if (!zeroedInRoutine || zeroedInRoutine.length === 0) {
                                    await recordSealingEventAction(sess.user_id, 'routine_zero_rupture', sess.routine_id)
                                }
                            }
                        }
                    }
                } catch (gamErr) {
                    console.error('[Gamification] Falha silenciosa na integração:', gamErr)
                }
            })()

            // Damos no máximo 5 segundos para a gamificação rodar antes de retornar sucesso ao usuário
            // Isso evita o spinner infinito se a gamificação travar, mas permite que ela tente rodar.
            // Nota: Em Server Actions, se retornarmos, o processo pode ser encerrado.
            // Para ser 100% fire-and-forget em Next.js/Vercel precisaríamos de Background Jobs.
            // Aqui vamos aguardar um pouco pra garantir os pontos, mas com limite.
            await Promise.race([
                gamificationPromise,
                new Promise(resolve => setTimeout(resolve, 5000))
            ])
        }

        console.log(`[CountAction] Sync finalizado com sucesso para ${sessionId}`);
        return { success: true }
    } catch (err: any) {
        console.error(`[CountAction] Erro fatal em syncCountSessionAction:`, err);
        return { error: `Erro interno inesperado: ${err.message || 'Contate o suporte.'}` }
    }
}

export async function deleteCountSessionAction(sessionId: string): Promise<{ success: boolean; error?: string }> {
    const userContext = await getServerAuthContext()
    const { data: sess } = await supabase
        .from('count_sessions')
        .select('status, user_id')
        .eq('id', sessionId)
        .single()
        
    if (!sess) return { success: false, error: 'Sessão não encontrada.' }
    
    if (sess.user_id !== userContext.id && userContext.role !== 'admin') {
        return { success: false, error: 'Acesso negado: Apenas o dono ou admin pode excluir.' }
    }
    if (sess.status === 'completed') return { success: false, error: 'Não é possível excluir uma contagem já finalizada.' }

    // Apaga os itens
    await supabase.from('count_session_items').delete().eq('session_id', sessionId)
    // Apaga a sessão
    const { error } = await supabase.from('count_sessions').delete().eq('id', sessionId)

    if (error) return { success: false, error: `Erro ao excluir: ${error.message}` }
    return { success: true }
}
