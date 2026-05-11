'use server'

import { getAdminSupabase } from '@/lib/supabase/admin'
import { getServerAuthContext } from '@/lib/server-auth-context'
import type {
    CKReceiving,
    CKReceivingItem,
    ReceivingStatus,
} from './receivings-types'

async function getCurrentUser() {
    const supabase = getAdminSupabase()
    const profile = await getServerAuthContext()
    const user = profile as any
    if (user.role === 'operator' && user.name === 'Cozinha Central') {
        user.role = 'kitchen'
    }
    return { supabase, user }
}

// ─────────────────────────────────────────────────────────────────────────────
// READ — Buscar entregas de uma semana e atrasadas
// ─────────────────────────────────────────────────────────────────────────────

export async function getWeeklyReceivingsAction(weekStart: string, weekEnd: string): Promise<{
    success: boolean
    data?: { receivings: CKReceiving[]; overdue: CKReceiving[] }
    error?: string
}> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'manager', 'kitchen'].includes(user.role)) throw new Error('Sem permissão')

        // Entregas da semana
        const { data: weekData, error: weekErr } = await supabase
            .from('ck_receivings')
            .select(`
                *,
                ck_receiving_items (*)
            `)
            .gte('delivery_date', weekStart)
            .lte('delivery_date', weekEnd)
            .order('delivery_date', { ascending: true })

        if (weekErr) throw weekErr

        // Entregas atrasadas (agendadas mas com data anterior ao início da semana)
        const today = new Date().toISOString().split('T')[0]
        const { data: overdueData, error: overdueErr } = await supabase
            .from('ck_receivings')
            .select(`
                *,
                ck_receiving_items (*)
            `)
            .lt('delivery_date', weekStart <= today ? weekStart : today)
            .in('status', ['scheduled'])
            .order('delivery_date', { ascending: true })

        if (overdueErr) throw overdueErr

        const toReceiving = (r: any): CKReceiving => ({
            ...r,
            items: r.ck_receiving_items || [],
            is_overdue: r.status === 'scheduled' && r.delivery_date < today,
        })

        return {
            success: true,
            data: {
                receivings: (weekData || []).map(toReceiving),
                overdue: (overdueData || []).map(toReceiving),
            }
        }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE — Criar novo recebimento
// ─────────────────────────────────────────────────────────────────────────────

export async function createReceivingAction(input: {
    title: string
    supplier_name?: string
    delivery_date: string
    delivery_period?: string
    delivery_time?: string
    priority?: string
    notes?: string
    items?: {
        item_name: string
        purchase_item_id?: string
        expected_qty?: number
        unit?: string
    }[]
}): Promise<{ success: boolean; data?: CKReceiving; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'manager'].includes(user.role)) throw new Error('Sem permissão para criar recebimentos')

        // Criar cabeçalho
        const { data: receiving, error: createErr } = await supabase
            .from('ck_receivings')
            .insert({
                title: input.title,
                supplier_name: input.supplier_name || null,
                delivery_date: input.delivery_date,
                delivery_period: input.delivery_period || null,
                delivery_time: input.delivery_time || null,
                priority: input.priority || 'normal',
                notes: input.notes || null,
                status: 'scheduled',
                created_by: user.id,
            })
            .select()
            .single()

        if (createErr) throw createErr

        // Criar itens (se houver)
        if (input.items && input.items.length > 0) {
            const { error: itemsErr } = await supabase
                .from('ck_receiving_items')
                .insert(
                    input.items.map(item => ({
                        receiving_id: receiving.id,
                        item_name: item.item_name,
                        purchase_item_id: item.purchase_item_id || null,
                        expected_qty: item.expected_qty || null,
                        unit: item.unit || null,
                        item_status: 'pending',
                    }))
                )
            if (itemsErr) throw itemsErr
        }

        // Criar evento de auditoria
        await supabase.from('ck_receiving_events').insert({
            receiving_id: receiving.id,
            user_id: user.id,
            event_type: 'created',
            payload: { title: input.title, delivery_date: input.delivery_date },
        })

        return { success: true, data: receiving }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION — Marcar como Recebido
// ─────────────────────────────────────────────────────────────────────────────

export async function markReceivingDeliveredAction(
    receivingId: string,
    receptionNotes?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'manager', 'kitchen'].includes(user.role)) throw new Error('Sem permissão')

        const { error } = await supabase
            .from('ck_receivings')
            .update({
                status: 'delivered',
                received_by: user.id,
                received_at: new Date().toISOString(),
                reception_notes: receptionNotes || null,
            })
            .eq('id', receivingId)

        if (error) throw error

        // Marcar todos os itens como recebidos
        await supabase
            .from('ck_receiving_items')
            .update({ item_status: 'received' })
            .eq('receiving_id', receivingId)
            .eq('item_status', 'pending')

        await supabase.from('ck_receiving_events').insert({
            receiving_id: receivingId,
            user_id: user.id,
            event_type: 'marked_delivered',
            payload: { reception_notes: receptionNotes },
        })

        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION — Marcar como Parcial
// ─────────────────────────────────────────────────────────────────────────────

export async function markReceivingPartialAction(
    receivingId: string,
    receptionNotes: string,
    itemUpdates?: {
        itemId: string
        item_status: 'received' | 'partial' | 'not_delivered' | 'refused'
        received_qty?: number
        notes?: string
    }[]
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'manager', 'kitchen'].includes(user.role)) throw new Error('Sem permissão')
        if (!receptionNotes?.trim()) throw new Error('Motivo/observação é obrigatório para recebimento parcial')

        const { error } = await supabase
            .from('ck_receivings')
            .update({
                status: 'partial',
                received_by: user.id,
                received_at: new Date().toISOString(),
                reception_notes: receptionNotes,
            })
            .eq('id', receivingId)

        if (error) throw error

        // Atualizar itens individualmente
        if (itemUpdates && itemUpdates.length > 0) {
            for (const upd of itemUpdates) {
                await supabase
                    .from('ck_receiving_items')
                    .update({
                        item_status: upd.item_status,
                        received_qty: upd.received_qty ?? null,
                        notes: upd.notes ?? null,
                    })
                    .eq('id', upd.itemId)
            }
        }

        await supabase.from('ck_receiving_events').insert({
            receiving_id: receivingId,
            user_id: user.id,
            event_type: 'marked_partial',
            payload: { reception_notes: receptionNotes, item_updates: itemUpdates },
        })

        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION — Marcar como Recusado
// ─────────────────────────────────────────────────────────────────────────────

export async function markReceivingRefusedAction(
    receivingId: string,
    refusalReason: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'manager', 'kitchen'].includes(user.role)) throw new Error('Sem permissão')
        if (!refusalReason?.trim()) throw new Error('Motivo é obrigatório para recusar entrega')

        const { error } = await supabase
            .from('ck_receivings')
            .update({
                status: 'refused',
                received_by: user.id,
                received_at: new Date().toISOString(),
                refusal_reason: refusalReason,
            })
            .eq('id', receivingId)

        if (error) throw error

        await supabase
            .from('ck_receiving_items')
            .update({ item_status: 'refused' })
            .eq('receiving_id', receivingId)
            .eq('item_status', 'pending')

        await supabase.from('ck_receiving_events').insert({
            receiving_id: receivingId,
            user_id: user.id,
            event_type: 'marked_refused',
            payload: { refusal_reason: refusalReason },
        })

        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION — Cancelar (somente admin/manager)
// ─────────────────────────────────────────────────────────────────────────────

export async function cancelReceivingAction(
    receivingId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'manager'].includes(user.role)) throw new Error('Sem permissão para cancelar')

        const { error } = await supabase
            .from('ck_receivings')
            .update({
                status: 'canceled',
                canceled_by: user.id,
                canceled_at: new Date().toISOString(),
            })
            .eq('id', receivingId)

        if (error) throw error

        await supabase.from('ck_receiving_events').insert({
            receiving_id: receivingId,
            user_id: user.id,
            event_type: 'canceled',
        })

        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// READ — Buscar itens do catálogo para autocomplete
// ─────────────────────────────────────────────────────────────────────────────

export async function searchPurchaseItemsAction(q: string): Promise<{
    success: boolean
    data?: { id: string; name: string; order_unit: string }[]
    error?: string
}> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'manager'].includes(user.role)) throw new Error('Sem permissão')

        const { data, error } = await supabase
            .from('purchase_items')
            .select('id, name, order_unit')
            .ilike('name', `%${q}%`)
            .eq('is_active', true)
            .order('name')
            .limit(20)

        if (error) throw error
        return { success: true, data: data || [] }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
