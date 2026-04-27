'use server'

import { getAdminSupabase } from '@/lib/supabase/admin'
import { getServerAuthContext } from '@/lib/server-auth-context'
import type { UserProfile } from './utils'
import { getUserStoreId } from './utils'
import type {
    PurchaseItem,
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseOrderEvent,
    OrderStatus,
    PurchaseEventType,
} from './types'

async function getCurrentUser() {
    const supabase = getAdminSupabase()
    const profile = await getServerAuthContext()
    return { supabase, user: profile as UserProfile }
}

// ─────────────────────────────────────────────────────────────────────────────
// CATÁLOGO DE ITENS
// ─────────────────────────────────────────────────────────────────────────────


export async function getPurchaseItemsAction(opts?: {
    category?: string
    search?: string
    includeInactive?: boolean
}): Promise<{ success: boolean; data?: PurchaseItem[]; error?: string }> {
    try {
        const { supabase } = await getCurrentUser()
        let query = supabase.from('purchase_items').select('*')

        if (!opts?.includeInactive) query = query.eq('is_active', true)
        if (opts?.category) query = query.eq('category', opts.category)
        if (opts?.search) query = query.ilike('name', `%${opts.search}%`)

        const { data, error } = await query.order('category').order('name')
        if (error) throw error
        return { success: true, data: data as PurchaseItem[] }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}

export async function createPurchaseItemAction(
    item: Omit<PurchaseItem, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; data?: PurchaseItem; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (user.role !== 'admin') throw new Error('Sem permissão')

        const { data, error } = await supabase
            .from('purchase_items')
            .insert(item)
            .select()
            .single()
        if (error) throw error
        return { success: true, data: data as PurchaseItem }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}

export async function updatePurchaseItemAction(
    id: string,
    updates: Partial<Omit<PurchaseItem, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (user.role !== 'admin') throw new Error('Sem permissão')

        const { error } = await supabase
            .from('purchase_items')
            .update(updates)
            .eq('id', id)
        if (error) throw error
        return { success: true }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}

export async function getPurchaseItemByIdAction(
    id: string
): Promise<{ success: boolean; data?: PurchaseItem; error?: string }> {
    try {
        const { supabase } = await getCurrentUser()
        const { data, error } = await supabase
            .from('purchase_items')
            .select('*')
            .eq('id', id)
            .single()
        if (error) throw error
        return { success: true, data: data as PurchaseItem }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PEDIDOS — GERENTE
// ─────────────────────────────────────────────────────────────────────────────

export async function createPurchaseOrderAction(explicitStoreId?: string): Promise<{
    success: boolean; data?: { id: string }; error?: string
}> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'manager'].includes(user.role)) throw new Error('Sem permissão')

        const storeId = getUserStoreId(user, explicitStoreId)

        if (!storeId) {
            // Gerente sem loja vinculada — orientar ajuste de cadastro
            return {
                success: false,
                error: 'Usuário sem loja vinculada. Ajuste o cadastro antes de criar pedidos.',
            }
        }

        const { data, error } = await supabase
            .from('purchase_orders')
            .insert({
                store_id: storeId,
                created_by: user.id,
                status: 'rascunho',
            })
            .select('id')
            .single()
        if (error) throw error

        await _logEvent(supabase, data.id, user.id, 'order_created', { store_id: storeId })

        return { success: true, data: { id: data.id } }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}

export async function getOrdersForStoreAction(opts?: {
    status?: OrderStatus[]
    limit?: number
}): Promise<{ success: boolean; data?: PurchaseOrder[]; storeName?: string; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()

        let query = supabase
            .from('purchase_orders')
            .select(`
                *,
                groups!store_id(name),
                users!created_by(name),
                purchase_order_items(count)
            `)

        // Gerente só vê seus pedidos; admin e kitchen vêem todos
        if (!['admin', 'kitchen'].includes(user.role)) {
            query = query.eq('store_id', user.primary_group_id!)
        }

        if (opts?.status?.length) query = query.in('status', opts.status)

        const { data, error } = await query
            .order('created_at', { ascending: false })
            .limit(opts?.limit ?? 50)
        if (error) throw error

        const orders = (data ?? []).map((row: any) => ({
            ...row,
            store_name: row.groups?.name ?? '',
            creator_name: row.users?.name ?? '',
            item_count: row.purchase_order_items?.[0]?.count ?? 0,
        })) as PurchaseOrder[]

        let storeName = 'Todas as Lojas'
        if (user.primary_group_id) {
            const { data: storeInfo } = await supabase.from('groups').select('name').eq('id', user.primary_group_id).single()
            if (storeInfo) storeName = storeInfo.name
        }

        return { success: true, data: orders, storeName }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}

export async function getOrderDetailAction(orderId: string): Promise<{
    success: boolean; data?: PurchaseOrder & { events: PurchaseOrderEvent[] }; error?: string
}> {
    try {
        const { supabase } = await getCurrentUser()

        const { data: order, error: orderErr } = await supabase
            .from('purchase_orders')
            .select(`
                *,
                groups!store_id(name),
                users!created_by(name),
                purchase_order_items(
                    *,
                    purchase_items(*)
                )
            `)
            .eq('id', orderId)
            .single()
        if (orderErr) throw orderErr

        const { data: events, error: eventsErr } = await supabase
            .from('purchase_order_events')
            .select('*, users!user_id(name)')
            .eq('order_id', orderId)
            .order('created_at', { ascending: true })
        if (eventsErr) throw eventsErr

        const mappedOrder = {
            ...order,
            store_name: (order as any).groups?.name ?? '',
            creator_name: (order as any).users?.name ?? '',
            items: ((order as any).purchase_order_items ?? []).map((oi: any) => ({
                ...oi,
                item: oi.purchase_items,
            })),
            events: (events ?? []).map((ev: any) => ({
                ...ev,
                user_name: ev.users?.name ?? '',
            })),
        }

        return { success: true, data: mappedOrder as any }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}

export async function addItemToOrderAction(
    orderId: string,
    itemId: string,
    requestedQty: number
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()

        // Verificar se o pedido ainda está em rascunho
        const { data: order } = await supabase
            .from('purchase_orders')
            .select('status, created_by')
            .eq('id', orderId)
            .single()

        if (!order) throw new Error('Pedido não encontrado')
        if (order.status !== 'rascunho') throw new Error('Pedido não pode ser alterado neste status')
        if (order.created_by !== user.id && user.role !== 'admin') throw new Error('Sem permissão')

        // Upsert: se já existe, atualiza a qty
        const { error } = await supabase
            .from('purchase_order_items')
            .upsert(
                { order_id: orderId, item_id: itemId, requested_qty: requestedQty },
                { onConflict: 'order_id,item_id' }
            )
        if (error) throw error

        await _logEvent(supabase, orderId, user.id, 'item_added', { item_id: itemId, requested_qty: requestedQty })

        return { success: true }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}

export async function removeItemFromOrderAction(
    orderId: string,
    orderItemId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()

        const { data: order } = await supabase
            .from('purchase_orders')
            .select('status, created_by')
            .eq('id', orderId)
            .single()

        if (!order) throw new Error('Pedido não encontrado')
        if (order.status !== 'rascunho') throw new Error('Pedido não pode ser alterado neste status')
        if (order.created_by !== user.id && user.role !== 'admin') throw new Error('Sem permissão')

        const { error } = await supabase
            .from('purchase_order_items')
            .delete()
            .eq('id', orderItemId)
        if (error) throw error

        await _logEvent(supabase, orderId, user.id, 'item_removed', { order_item_id: orderItemId })

        return { success: true }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}

export async function updateItemQtyAction(
    orderId: string,
    orderItemId: string,
    requestedQty: number
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()

        const { data: order } = await supabase
            .from('purchase_orders')
            .select('status, created_by')
            .eq('id', orderId)
            .single()

        if (!order) throw new Error('Pedido não encontrado')
        if (order.status !== 'rascunho') throw new Error('Pedido não pode ser alterado neste status')
        if (order.created_by !== user.id && user.role !== 'admin') throw new Error('Sem permissão')

        const { error } = await supabase
            .from('purchase_order_items')
            .update({ requested_qty: requestedQty })
            .eq('id', orderItemId)
        if (error) throw error

        await _logEvent(supabase, orderId, user.id, 'item_qty_updated', { order_item_id: orderItemId, requested_qty: requestedQty })

        return { success: true }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}

export async function submitOrderAction(
    orderId: string,
    notes?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()

        const { data: order } = await supabase
            .from('purchase_orders')
            .select('status, created_by')
            .eq('id', orderId)
            .single()

        if (!order) throw new Error('Pedido não encontrado')
        if (order.status !== 'rascunho') throw new Error('Somente rascunhos podem ser enviados')
        if (order.created_by !== user.id && user.role !== 'admin') throw new Error('Sem permissão')

        // Verifica se tem itens
        const { count } = await supabase
            .from('purchase_order_items')
            .select('*', { count: 'exact', head: true })
            .eq('order_id', orderId)

        if (!count || count === 0) throw new Error('Adicione pelo menos um item antes de enviar')

        const { error } = await supabase
            .from('purchase_orders')
            .update({ status: 'enviado', sent_at: new Date().toISOString(), notes: notes ?? null })
            .eq('id', orderId)
        if (error) throw error

        await _logEvent(supabase, orderId, user.id, 'order_submitted', { notes })

        return { success: true }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}

export async function cancelOrderAction(
    orderId: string,
    reason: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()

        const { data: order } = await supabase
            .from('purchase_orders')
            .select('status')
            .eq('id', orderId)
            .single()

        if (!order) throw new Error('Pedido não encontrado')
        if (['recebido', 'cancelado'].includes(order.status)) {
            throw new Error('Este pedido não pode mais ser cancelado')
        }
        if (!['admin', 'manager'].includes(user.role)) throw new Error('Sem permissão')

        const prevStatus = order.status

        const { error } = await supabase
            .from('purchase_orders')
            .update({ status: 'cancelado' })
            .eq('id', orderId)
        if (error) throw error

        await _logEvent(supabase, orderId, user.id, 'order_cancelled', {
            previous_status: prevStatus,
            reason,
        })

        return { success: true }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// COZINHA CENTRAL
// ─────────────────────────────────────────────────────────────────────────────

export async function getOrdersForKitchenAction(): Promise<{
    success: boolean; data?: PurchaseOrder[]; error?: string
}> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'kitchen', 'manager'].includes(user.role)) throw new Error('Sem permissão')

        const { data, error } = await supabase
            .from('purchase_orders')
            .select(`
                *,
                groups!store_id(name),
                users!created_by(name),
                purchase_order_items(count)
            `)
            .in('status', ['enviado', 'em_analise', 'em_separacao', 'separado'])
            .order('sent_at', { ascending: true })
        if (error) throw error

        const orders = (data ?? []).map((row: any) => ({
            ...row,
            store_name: row.groups?.name ?? '',
            creator_name: row.users?.name ?? '',
            item_count: row.purchase_order_items?.[0]?.count ?? 0,
        })) as PurchaseOrder[]

        return { success: true, data: orders }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}

export async function updateKitchenStatusAction(
    orderId: string,
    newStatus: 'em_analise' | 'em_separacao'
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'kitchen'].includes(user.role)) throw new Error('Sem permissão')

        const { data: order } = await supabase
            .from('purchase_orders')
            .select('status')
            .eq('id', orderId)
            .single()
        if (!order) throw new Error('Pedido não encontrado')

        const prevStatus = order.status

        const { error } = await supabase
            .from('purchase_orders')
            .update({ status: newStatus })
            .eq('id', orderId)
        if (error) throw error

        await _logEvent(supabase, orderId, user.id, 'status_changed', {
            from: prevStatus,
            to: newStatus,
        })

        return { success: true }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}

export async function updateSeparatedQtyAction(
    orderId: string,
    orderItemId: string,
    separatedQty: number,
    notes?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'kitchen'].includes(user.role)) throw new Error('Sem permissão')

        const { error } = await supabase
            .from('purchase_order_items')
            .update({ separated_qty: separatedQty, notes: notes ?? null })
            .eq('id', orderItemId)
        if (error) throw error

        await _logEvent(supabase, orderId, user.id, 'separation_updated', {
            order_item_id: orderItemId,
            separated_qty: separatedQty,
            notes,
        })

        return { success: true }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}

export async function markOrderAsSeparatedAction(
    orderId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'kitchen'].includes(user.role)) throw new Error('Sem permissão')

        const { data: order } = await supabase
            .from('purchase_orders')
            .select('status')
            .eq('id', orderId)
            .single()
        if (!order) throw new Error('Pedido não encontrado')

        const prevStatus = order.status

        const { error } = await supabase
            .from('purchase_orders')
            .update({ status: 'separado' })
            .eq('id', orderId)
        if (error) throw error

        await _logEvent(supabase, orderId, user.id, 'order_separated', { from: prevStatus })

        return { success: true }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// RECEBIMENTO — GERENTE
// ─────────────────────────────────────────────────────────────────────────────

export async function confirmReceivedAction(
    orderId: string,
    receivedItems: Array<{ orderItemId: string; receivedQty: number; notes?: string }>
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'manager'].includes(user.role)) throw new Error('Sem permissão')

        // Atualizar cada item com a qtd recebida
        for (const ri of receivedItems) {
            const { error } = await supabase
                .from('purchase_order_items')
                .update({ received_qty: ri.receivedQty, notes: ri.notes ?? null })
                .eq('id', ri.orderItemId)
            if (error) throw error
        }

        // Determinar se houve divergência
        const hasDivergence = receivedItems.some(ri => {
            // Pegar a qty separada e comparar — simplificado: a lógica completa fica na UI
            return ri.notes && ri.notes.length > 0
        })

        const newStatus = hasDivergence ? 'divergente' : 'recebido'

        const { error } = await supabase
            .from('purchase_orders')
            .update({ status: newStatus, received_at: new Date().toISOString() })
            .eq('id', orderId)
        if (error) throw error

        await _logEvent(supabase, orderId, user.id,
            hasDivergence ? 'divergence_registered' : 'order_received',
            { received_items: receivedItems }
        )

        return { success: true }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}

export async function confirmReceivedWithDivergenceAction(
    orderId: string,
    notes: string,
    receivedItems: Array<{ orderItemId: string; receivedQty: number; notes?: string }>
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'manager'].includes(user.role)) throw new Error('Sem permissão')

        for (const ri of receivedItems) {
            const { error } = await supabase
                .from('purchase_order_items')
                .update({ received_qty: ri.receivedQty, notes: ri.notes ?? null })
                .eq('id', ri.orderItemId)
            if (error) throw error
        }

        const { error } = await supabase
            .from('purchase_orders')
            .update({ status: 'divergente', received_at: new Date().toISOString(), notes })
            .eq('id', orderId)
        if (error) throw error

        await _logEvent(supabase, orderId, user.id, 'divergence_registered', {
            notes,
            received_items: receivedItems,
        })

        return { success: true }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — HISTÓRICO GERAL
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllOrdersAdminAction(opts?: {
    status?: OrderStatus[]
    storeId?: string
    from?: string
    to?: string
    limit?: number
}): Promise<{ success: boolean; data?: PurchaseOrder[]; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (user.role !== 'admin') throw new Error('Sem permissão')

        let query = supabase
            .from('purchase_orders')
            .select(`
                *,
                groups!store_id(name),
                users!created_by(name),
                purchase_order_items(count)
            `)

        if (opts?.status?.length) query = query.in('status', opts.status)
        if (opts?.storeId) query = query.eq('store_id', opts.storeId)
        if (opts?.from) query = query.gte('created_at', opts.from)
        if (opts?.to) query = query.lte('created_at', opts.to)

        const { data, error } = await query
            .order('created_at', { ascending: false })
            .limit(opts?.limit ?? 100)
        if (error) throw error

        const orders = (data ?? []).map((row: any) => ({
            ...row,
            store_name: row.groups?.name ?? '',
            creator_name: row.users?.name ?? '',
            item_count: row.purchase_order_items?.[0]?.count ?? 0,
        })) as PurchaseOrder[]

        return { success: true, data: orders }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITÁRIOS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

async function _logEvent(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    orderId: string,
    userId: string,
    eventType: PurchaseEventType,
    payload: Record<string, unknown>
) {
    await supabase.from('purchase_order_events').insert({
        order_id: orderId,
        user_id: userId,
        event_type: eventType,
        payload,
    })
}
