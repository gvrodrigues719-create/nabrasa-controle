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
    const user = profile as UserProfile
    // Workaround: if the DB check constraint hasn't been updated yet, 'Cozinha Central' comes as 'operator'
    if (user.role === 'operator' && user.name === 'Cozinha Central') {
        user.role = 'kitchen'
    }
    return { supabase, user }
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
        if (!['admin', 'manager'].includes(user.role)) throw new Error('Sem permissão')

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
        if (!['admin', 'manager', 'operator'].includes(user.role)) throw new Error('Sem permissão')

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

export async function getKitchenPendingCountAction(): Promise<{ success: boolean; data?: number; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'kitchen'].includes(user.role)) throw new Error('Sem permissão')

        const { count, error } = await supabase
            .from('purchase_orders')
            .select('*', { count: 'exact', head: true })
            .in('status', ['enviado', 'em_analise', 'em_separacao', 'separado'])
        
        if (error) throw error

        return { success: true, data: count ?? 0 }
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

        const storeId = getUserStoreId(user)
        // Gerente só vê seus pedidos; admin e kitchen vêem todos
        if (!['admin', 'kitchen'].includes(user.role)) {
            if (storeId) query = query.eq('store_id', storeId)
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
        if (storeId) {
            const { data: storeInfo } = await supabase.from('groups').select('name').eq('id', storeId).single()
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
        const { supabase, user } = await getCurrentUser()

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

        const storeId = getUserStoreId(user)
        if (!['admin', 'kitchen'].includes(user.role) && order.store_id !== storeId) {
            throw new Error('Sem permissão: Este pedido pertence a outra loja')
        }

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

        const { data: existing } = await supabase
            .from('purchase_order_items')
            .select('id')
            .eq('order_id', orderId)
            .eq('item_id', itemId)
            .maybeSingle()

        if (existing) {
            const { error } = await supabase
                .from('purchase_order_items')
                .update({ requested_qty: requestedQty })
                .eq('id', existing.id)
            if (error) throw error
        } else {
            const { data: item } = await supabase
                .from('purchase_items')
                .select('default_unit_price')
                .eq('id', itemId)
                .single()

            const defaultPrice = item?.default_unit_price ?? null

            const { error } = await supabase
                .from('purchase_order_items')
                .insert({
                    order_id: orderId,
                    item_id: itemId,
                    requested_qty: requestedQty,
                    unit_price: defaultPrice,
                    price_source: defaultPrice ? 'catalog' : 'manual'
                })
            if (error) throw error
        }

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
            .select('status, store_id')
            .eq('id', orderId)
            .single()

        if (!order) throw new Error('Pedido não encontrado')
        if (['recebido', 'cancelado'].includes(order.status)) {
            throw new Error('Este pedido não pode mais ser cancelado')
        }
        if (!['admin', 'manager', 'operator'].includes(user.role)) throw new Error('Sem permissão')

        const storeId = getUserStoreId(user)
        if (user.role !== 'admin' && order.store_id !== storeId) throw new Error('Sem permissão: Este pedido pertence a outra loja')

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

export async function deletePurchaseOrderAction(
    orderId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()

        // Permissão: admin pode tudo, kitchen pode se for da cozinha central
        if (!['admin', 'kitchen'].includes(user.role)) {
            throw new Error('Sem permissão para excluir pedidos')
        }

        const { error } = await supabase
            .from('purchase_orders')
            .delete()
            .eq('id', orderId)
        
        if (error) throw error

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
        if (!['admin', 'kitchen'].includes(user.role)) throw new Error('Sem permissão')

        const { data, error } = await supabase
            .from('purchase_orders')
            .select(`
                *,
                groups!store_id(name),
                users!created_by(name),
                purchase_order_items(count)
            `)
            .in('status', ['enviado', 'em_analise', 'em_separacao', 'separado', 'divergente'])
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

export async function addItemByKitchenAction(
    orderId: string,
    itemId: string,
    qty: number
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
        // Permite adicionar se estiver enviado, em analise ou em separacao
        if (!['enviado', 'em_analise', 'em_separacao'].includes(order.status)) {
            throw new Error('Não é possível adicionar itens a este pedido no status atual')
        }

        const { data: existing } = await supabase
            .from('purchase_order_items')
            .select('id')
            .eq('order_id', orderId)
            .eq('item_id', itemId)
            .maybeSingle()

        if (existing) {
            // Se já existe, atualiza a quantidade separada
            const { error } = await supabase
                .from('purchase_order_items')
                .update({ separated_qty: qty })
                .eq('id', existing.id)
            if (error) throw error
        } else {
            // Se não existe, cria com requested_qty = 0 e separated_qty = qty
            const { error } = await supabase
                .from('purchase_order_items')
                .insert({
                    order_id: orderId,
                    item_id: itemId,
                    requested_qty: 0,
                    separated_qty: qty,
                    separation_notes: 'Adicionado pela cozinha central'
                })
            if (error) throw error
        }

        await _logEvent(supabase, orderId, user.id, 'item_added_by_kitchen' as any, { item_id: itemId, qty })

        return { success: true }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}

export async function removeItemByKitchenAction(
    orderId: string,
    orderItemId: string
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
        if (!['enviado', 'em_analise', 'em_separacao'].includes(order.status)) {
            throw new Error('Não é possível remover itens deste pedido no status atual')
        }

        const { error } = await supabase
            .from('purchase_order_items')
            .delete()
            .eq('id', orderItemId)
        
        if (error) throw error

        await _logEvent(supabase, orderId, user.id, 'item_removed_by_kitchen' as any, { order_item_id: orderItemId })

        return { success: true }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}

export async function updateSeparatedQtyAction(
    orderId: string,
    orderItemId: string,
    separatedQty: number,
    separationNotes?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'kitchen'].includes(user.role)) throw new Error('Sem permissão')

        const { error } = await supabase
            .from('purchase_order_items')
            .update({
                separated_qty: separatedQty,
                separation_notes: separationNotes ?? null,
            })
            .eq('id', orderItemId)
        if (error) throw error

        await _logEvent(supabase, orderId, user.id, 'separation_updated', {
            order_item_id: orderItemId,
            separated_qty: separatedQty,
            separation_notes: separationNotes ?? null,
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

export async function reopenOrderForSeparationAction(
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
        
        // Só permite reabrir se estiver 'separado'. 
        // Se já foi 'entregue', 'recebido' ou 'divergente', a loja já está com o pedido.
        if (order.status !== 'separado') throw new Error('Somente pedidos separados e ainda não recebidos podem ser reabertos')

        const prevStatus = order.status

        const { error } = await supabase
            .from('purchase_orders')
            .update({ status: 'em_separacao' })
            .eq('id', orderId)
        if (error) throw error

        await _logEvent(supabase, orderId, user.id, 'status_changed', { 
            from: prevStatus, 
            to: 'em_separacao',
            reason: 'Reaberto pela cozinha para edição'
        })

        return { success: true }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFERÊNCIA DE SAÍDA (EXPEDIÇÃO CK)
// ─────────────────────────────────────────────────────────────────────────────

export async function saveDispatchDraftAction(
    orderId: string,
    dispatchedItems: Array<{ orderItemId: string; dispatchedQty: number; divergenceReason?: string }>
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'kitchen'].includes(user.role)) throw new Error('Sem permissão')

        // 0. Bloquear payload vazio
        if (!dispatchedItems || dispatchedItems.length === 0) {
            throw new Error('Nenhum item informado para expedição.')
        }

        // 1. Validar pedido e status
        const { data: order } = await supabase
            .from('purchase_orders')
            .select('status')
            .eq('id', orderId)
            .single()

        if (!order) throw new Error('Pedido não encontrado')
        if (!['em_separacao', 'separado'].includes(order.status)) {
            throw new Error('O pedido não está no status correto para conferência.')
        }

        // 2. Validar quantidades antes de qualquer I/O adicional
        for (const item of dispatchedItems) {
            if (item.dispatchedQty < 0) throw new Error('Quantidade não pode ser negativa.')
        }

        // 3. Validar ownership em lote — SELECT único antes de qualquer UPDATE
        //    Se QUALQUER orderItemId não pertencer a este orderId, bloquear tudo.
        const orderItemIds = dispatchedItems.map(i => i.orderItemId)
        const { data: dbItems, error: fetchErr } = await supabase
            .from('purchase_order_items')
            .select('id')
            .eq('order_id', orderId)
            .in('id', orderItemIds)

        if (fetchErr) throw fetchErr
        if (!dbItems || dbItems.length !== orderItemIds.length) {
            throw new Error('Item não pertence a este pedido.')
        }

        // 4. Todos os itens validados — executar updates
        for (const item of dispatchedItems) {
            const { error } = await supabase
                .from('purchase_order_items')
                .update({
                    separated_qty: item.dispatchedQty,
                    separation_notes: item.divergenceReason || null
                })
                .eq('id', item.orderItemId)
                .eq('order_id', orderId)
            if (error) throw error
        }

        await _logEvent(supabase, orderId, user.id, 'dispatch_draft_saved' as any, {
            item_count: dispatchedItems.length
        })

        return { success: true }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}

export async function confirmDispatchAction(
    orderId: string,
    dispatchedItems: Array<{ orderItemId: string; requestedQty: number; dispatchedQty: number; divergenceReason?: string }>
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'kitchen'].includes(user.role)) throw new Error('Sem permissão')

        // 0. Bloquear payload vazio
        if (!dispatchedItems || dispatchedItems.length === 0) {
            throw new Error('Nenhum item informado para expedição.')
        }

        // 1. Validar pedido e status
        const { data: order } = await supabase
            .from('purchase_orders')
            .select('status')
            .eq('id', orderId)
            .single()

        if (!order) throw new Error('Pedido não encontrado')
        if (!['em_separacao', 'separado'].includes(order.status)) {
            throw new Error('Somente pedidos em separação podem ser expedidos.')
        }

        // 2. Buscar todos os itens do pedido no banco para validação de integridade total
        const { data: dbItems, error: fetchErr } = await supabase
            .from('purchase_order_items')
            .select('id, requested_qty')
            .eq('order_id', orderId)

        if (fetchErr) throw fetchErr
        if (!dbItems || dbItems.length === 0) throw new Error('Pedido sem itens cadastrados.')

        // 3. Validar se todos os itens foram conferidos (e apenas eles)
        const payloadIds = dispatchedItems.map(i => i.orderItemId)
        const dbIds = dbItems.map(i => i.id)

        // Check for duplicates in payload
        const uniquePayloadIds = new Set(payloadIds)
        if (uniquePayloadIds.size !== payloadIds.length) {
            throw new Error('Item duplicado na conferência.')
        }

        // Check if payload has exactly all items from DB
        if (payloadIds.length !== dbIds.length) {
            throw new Error('Todos os itens do pedido precisam ser conferidos antes do envio.')
        }

        const allItemsPresent = dbIds.every(id => uniquePayloadIds.has(id))
        if (!allItemsPresent) {
            throw new Error('Item não pertence a este pedido ou itens obrigatórios ausentes.')
        }

        // 4. Criar mapa de quantidades do banco para validação segura (não confiar no requestedQty do payload)
        const dbQtyMap = new Map<string, number>()
        dbItems.forEach(item => dbQtyMap.set(item.id, item.requested_qty))

        // 5. Validar quantidades e motivos
        for (const item of dispatchedItems) {
            if (item.dispatchedQty < 0) throw new Error('Quantidade não pode ser negativa.')
            
            const dbRequestedQty = dbQtyMap.get(item.orderItemId) ?? 0
            const diff = !qtyEqual(dbRequestedQty, item.dispatchedQty)
            
            if (diff && !item.divergenceReason) {
                throw new Error('Motivo de divergência é obrigatório quando a quantidade enviada difere da pedida.')
            }
        }

        // 6. Executar updates
        let hasDivergence = false
        for (const item of dispatchedItems) {
            const dbRequestedQty = dbQtyMap.get(item.orderItemId) ?? 0
            const diff = !qtyEqual(dbRequestedQty, item.dispatchedQty)
            if (diff) hasDivergence = true

            const { error } = await supabase
                .from('purchase_order_items')
                .update({
                    separated_qty: item.dispatchedQty,
                    separation_notes: item.divergenceReason || null
                })
                .eq('id', item.orderItemId)
                .eq('order_id', orderId)
            if (error) throw error
        }

        // 7. Atualizar status do pedido
        const newStatus: OrderStatus = 'em_entrega'
        const { error: orderErr } = await supabase
            .from('purchase_orders')
            .update({ status: newStatus })
            .eq('id', orderId)
        if (orderErr) throw orderErr

        // 8. Registrar evento
        await _logEvent(supabase, orderId, user.id, 'dispatch_completed' as any, {
            has_divergence: hasDivergence,
            status_set: newStatus
        })

        return { success: true }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// RECEBIMENTO — GERENTE
// ─────────────────────────────────────────────────────────────────────────────

/** Comparação segura para decimais */
function qtyEqual(a: number | null | undefined, b: number | null | undefined): boolean {
    return Math.abs(Number(a ?? 0) - Number(b ?? 0)) < 0.0001
}

export async function confirmReceivedAction(
    orderId: string,
    receivedItems: Array<{ orderItemId: string; receivedQty: number; receivedNotes?: string }>
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'manager', 'operator'].includes(user.role)) throw new Error('Sem permissão')

        // 1. Validar IDOR e Status do Pedido
        const { data: order } = await supabase
            .from('purchase_orders')
            .select('status, store_id')
            .eq('id', orderId)
            .single()

        if (!order) throw new Error('Pedido não encontrado')
        if (order.status !== 'em_entrega') throw new Error('O pedido não está pronto para recebimento (status inválido).')

        const storeId = getUserStoreId(user)

        // Validar permissão de loja (Admin pode tudo, mas se não for, o pedido TEM que ser da loja dele)
        if (user.role !== 'admin' && order.store_id !== storeId) {
            throw new Error('Sem permissão: Você só pode confirmar recebimento de pedidos da sua própria loja.')
        }

        // 2. Gravar received_qty e received_notes de cada item
        for (const ri of receivedItems) {
            if (ri.receivedQty < 0) throw new Error('A quantidade recebida não pode ser negativa.')
            
            // Buscar separated_qty validando ownership (proteção IDOR: item deve pertencer ao orderId)
            const { data: itemData, error: itemFetchErr } = await supabase
                .from('purchase_order_items')
                .select('separated_qty')
                .eq('id', ri.orderItemId)
                .eq('order_id', orderId)
                .single()

            if (itemFetchErr || !itemData) {
                throw new Error('Item não pertence a este pedido.')
            }

            const sepQty = itemData.separated_qty ?? 0
            if (!qtyEqual(sepQty, ri.receivedQty) && !ri.receivedNotes) {
                throw new Error('Você deve informar um motivo se a quantidade recebida for diferente da enviada pela CK.')
            }

            const { error } = await supabase
                .from('purchase_order_items')
                .update({
                    received_qty: ri.receivedQty,
                    received_notes: ri.receivedNotes ?? null,
                })
                .eq('id', ri.orderItemId)
                .eq('order_id', orderId)
            if (error) throw error
        }

        // 2. Buscar todos os itens atualizados para calcular divergência no servidor
        const { data: allItems, error: fetchErr } = await supabase
            .from('purchase_order_items')
            .select('requested_qty, separated_qty, received_qty, separation_notes, received_notes, item_id, purchase_items(name)')
            .eq('order_id', orderId)
        if (fetchErr) throw fetchErr

        // 3. Determinar divergência: qualquer diferença numérica em qualquer etapa
        const divergentItems = (allItems ?? []).filter((item: any) => {
            const sepDiff = !qtyEqual(item.requested_qty, item.separated_qty)
            const recvDiff = !qtyEqual(item.separated_qty ?? item.requested_qty, item.received_qty)
            return sepDiff || recvDiff
        })

        const hasDivergence = divergentItems.length > 0
        const newStatus: OrderStatus = hasDivergence ? 'divergente' : 'recebido'

        // 4. Atualizar status do pedido
        const { error: orderErr } = await supabase
            .from('purchase_orders')
            .update({ status: newStatus, received_at: new Date().toISOString() })
            .eq('id', orderId)
        if (orderErr) throw orderErr

        // 5. Registrar evento com payload detalhado
        if (hasDivergence) {
            const divergencePayload = divergentItems.map((item: any) => ({
                item_name: item.purchase_items?.name ?? item.item_id,
                requested_qty: item.requested_qty,
                separated_qty: item.separated_qty,
                received_qty: item.received_qty,
                separation_diff: Number(item.separated_qty ?? 0) - Number(item.requested_qty ?? 0),
                receiving_diff: Number(item.received_qty ?? 0) - Number(item.separated_qty ?? item.requested_qty ?? 0),
                separation_notes: item.separation_notes,
                received_notes: item.received_notes,
            }))
            await _logEvent(supabase, orderId, user.id, 'divergence_registered', {
                divergent_items: divergencePayload,
            })
        } else {
            await _logEvent(supabase, orderId, user.id, 'order_received', {
                item_count: (allItems ?? []).length,
            })
        }

        return { success: true }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}

/** @deprecated Use confirmReceivedAction — divergência agora é calculada automaticamente no servidor */
export async function confirmReceivedWithDivergenceAction(
    orderId: string,
    notes: string,
    receivedItems: Array<{ orderItemId: string; receivedQty: number; notes?: string }>
): Promise<{ success: boolean; error?: string }> {
    // Delegate to the unified action, mapping old 'notes' to 'receivedNotes'
    return confirmReceivedAction(
        orderId,
        receivedItems.map(ri => ({ orderItemId: ri.orderItemId, receivedQty: ri.receivedQty, receivedNotes: ri.notes }))
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMENTÁRIOS DO PEDIDO
// ─────────────────────────────────────────────────────────────────────────────

export async function addOrderCommentAction(
    orderId: string,
    message: string
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!message || message.trim() === '') throw new Error('Mensagem vazia')

        const { supabase, user } = await getCurrentUser()
        
        // Verifica se a mensagem é permitida
        const { data: order } = await supabase
            .from('purchase_orders')
            .select('store_id')
            .eq('id', orderId)
            .single()
        
        if (!order) throw new Error('Pedido não encontrado')

        if (user.role === 'manager' && order.store_id !== user.primary_group_id) {
            throw new Error('Sem permissão para comentar neste pedido')
        }

        const { error } = await supabase.from('purchase_order_comments').insert({
            order_id: orderId,
            user_id: user.id,
            user_name: user.name,
            user_role: user.role,
            message: message.trim()
        })
        if (error) throw error

        await _logEvent(supabase, orderId, user.id, 'comment_added' as any, { message: message.trim() })

        return { success: true }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}

export async function getOrderCommentsAction(
    orderId: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
        const { supabase } = await getCurrentUser()
        const { data, error } = await supabase
            .from('purchase_order_comments')
            .select('*')
            .eq('order_id', orderId)
            .order('created_at', { ascending: true })
        if (error) throw error
        return { success: true, data }
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

export async function updateOrderItemPriceAction(
    orderId: string,
    orderItemId: string,
    unitPrice: number
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()

        if (!['admin', 'kitchen'].includes(user.role)) {
            throw new Error('Sem permissão para editar preços')
        }

        const { error } = await supabase
            .from('purchase_order_items')
            .update({
                unit_price: unitPrice,
                price_source: 'manual',
                price_updated_by: user.id,
                price_updated_at: new Date().toISOString()
            })
            .eq('id', orderItemId)
            .eq('order_id', orderId)

        if (error) throw error

        await _logEvent(supabase, orderId, user.id, 'item_price_updated', { item_id: orderItemId, unit_price: unitPrice })

        return { success: true }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}

export async function updateKitchenOrderNotesAction(orderId: string, notes: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()

        if (!['admin', 'kitchen'].includes(user.role)) {
            throw new Error('Sem permissão para editar observações da cozinha')
        }

        const { error } = await supabase
            .from('purchase_orders')
            .update({ kitchen_notes: notes })
            .eq('id', orderId)

        if (error) throw error

        await _logEvent(supabase, orderId, user.id, 'kitchen_notes_updated' as any, { notes })

        return { success: true }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}
