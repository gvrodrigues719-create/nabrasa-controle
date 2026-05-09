'use server'

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveOperator } from '@/app/actions/pinAuth'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getKitchenSessionDetailAction(sessionId: string) {
    try {
        // Usamos admin para evitar bloqueios de RLS no detalhamento
        const { data: session, error: sErr } = await supabaseAdmin
            .from('count_sessions')
            .select(`
                *,
                groups(name),
                users:user_id(name)
            `)
            .eq('id', sessionId)
            .single()

        if (sErr) throw sErr

        const { data: items, error: iErr } = await supabaseAdmin
            .from('count_session_items')
            .select(`
                *,
                items(name, unit)
            `)
            .eq('session_id', sessionId)
            .order('items(name)')

        if (iErr) throw iErr

        return { success: true, session, items }
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
