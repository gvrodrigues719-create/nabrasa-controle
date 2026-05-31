'use server'

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveOperator } from '@/app/actions/pinAuth'
import { getServerAuthContext } from '@/lib/server-auth-context'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getKitchenSessionDetailAction(sessionId: string) {
    try {
        // ── P0-3: Validação de autenticação e escopo ──
        const userContext = await getServerAuthContext()
        const isAdmin = userContext.role === 'admin'
        const isKitchen = userContext.role === 'kitchen'
        const isKitchenGroup = userContext.groups?.macro_sector === 'Cozinha Central'

        if (!isAdmin && !isKitchen && !isKitchenGroup) {
            console.warn('[getKitchenSessionDetailAction] Acesso negado:', {
                userId: userContext.id,
                role: userContext.role,
                macro_sector: userContext.groups?.macro_sector
            })
            return { success: false, error: 'Acesso negado: Somente operadores da Cozinha Central ou administradores podem acessar este histórico.' }
        }

        const { data: session, error: sErr } = await supabaseAdmin
            .from('count_sessions')
            .select(`
                *,
                groups(name, macro_sector),
                users:user_id(name)
            `)
            .eq('id', sessionId)
            .single()

        if (sErr) throw sErr

        // Validar que a sessão pertence à Cozinha Central
        if ((session as any)?.groups?.macro_sector !== 'Cozinha Central' && !isAdmin) {
            return { success: false, error: 'Esta sessão não pertence à Cozinha Central.' }
        }

        const { data: items, error: iErr } = await supabaseAdmin
            .from('count_session_items')
            .select(`
                *,
                items(name, unit)
            `)
            .eq('session_id', sessionId)

        if (iErr) throw iErr

        // Ordenar os itens alfabeticamente pelo nome em memória no JS
        const sortedItems = (items || []).sort((a: any, b: any) => {
            const nameA = a.items?.name || ''
            const nameB = b.items?.name || ''
            return nameA.localeCompare(nameB)
        })

        return { success: true, session, items: sortedItems }
    } catch (e: any) {
        console.error('[getKitchenSessionDetailAction] Erro:', e.message)
        return { success: false, error: e.message }
    }
}

export async function validateKitchenSessionAction(
    sessionId: string, 
    itemsCorrections: { itemId: string, quantity: number, isZeroed: boolean }[],
    reason: string
) {
    try {
        const op = await getActiveOperator()
        let userId = op?.userId

        if (!op) {
            const supabase = await createServerClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Não autenticado')
            userId = user.id
        }

        // 1. Atualizar itens validados
        for (const item of itemsCorrections) {
            await supabaseAdmin
                .from('count_session_items')
                .update({
                    validated_quantity: item.quantity,
                    validated_is_zeroed: item.isZeroed
                })
                .eq('session_id', sessionId)
                .eq('item_id', item.itemId)
        }

        // 2. Atualizar status da sessão
        const { error: sessErr } = await supabaseAdmin
            .from('count_sessions')
            .update({
                validation_status: 'corrected',
                validation_reason: reason,
                validated_by: userId,
                validated_at: new Date().toISOString()
            })
            .eq('id', sessionId)

        if (sessErr) throw sessErr

        return { success: true }
    } catch (e: any) {
        console.error('[validateKitchenSessionAction] Erro:', e.message)
        return { success: false, error: e.message }
    }
}

export async function deleteKitchenSessionAction(_sessionId: string) {
    // ── P0-1: Hard delete completamente bloqueado ──
    // Sessões da Cozinha Central não podem ser deletadas.
    // Histórico deve ser preservado para rastreabilidade operacional.
    console.warn('[deleteKitchenSessionAction] Tentativa de delete bloqueada:', { sessionId: _sessionId })
    return {
        success: false,
        error: 'Operação bloqueada: Sessões de contagem não podem ser excluídas. O histórico é preservado para auditoria.'
    }
}
