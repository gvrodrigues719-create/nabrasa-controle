'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getActiveOperator } from '@/app/actions/pinAuth'

export async function getKitchenSessionDetailAction(sessionId: string) {
    const supabase = await createServerClient()

    try {
        const { data: session, error: sErr } = await supabase
            .from('count_sessions')
            .select(`
                *,
                groups(name),
                users!user_id(name)
            `)
            .eq('id', sessionId)
            .single()

        if (sErr) throw sErr

        const { data: items, error: iErr } = await supabase
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
        return { success: false, error: e.message }
    }
}

export async function validateKitchenSessionAction(
    sessionId: string, 
    itemsCorrections: { itemId: string, quantity: number, isZeroed: boolean }[],
    reason: string
) {
    const supabase = await createServerClient()

    try {
        const op = await getActiveOperator()
        let userId = op?.userId

        if (!op) {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Não autenticado')
            userId = user.id
        }

        // 1. Atualizar itens validados
        for (const item of itemsCorrections) {
            await supabase
                .from('count_session_items')
                .update({
                    validated_quantity: item.quantity,
                    validated_is_zeroed: item.isZeroed
                })
                .eq('session_id', sessionId)
                .eq('item_id', item.itemId)
        }

        // 2. Atualizar status da sessão
        const { error: sessErr } = await supabase
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
        return { success: false, error: e.message }
    }
}
