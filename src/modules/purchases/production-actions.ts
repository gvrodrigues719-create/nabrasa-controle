'use server'

import { getAdminSupabase } from '@/lib/supabase/admin'
import { getServerAuthContext } from '@/lib/server-auth-context'
import type { 
    ProductionSuggestion, 
    AdjustmentReason,
    ProductionOrder,
    ProductionOrderItem
} from './types'

async function getCurrentUser() {
    const supabase = getAdminSupabase()
    const profile = await getServerAuthContext()
    const user = profile as any
    // Workaround para role kitchen se vier como operator
    if (user.role === 'operator' && user.name === 'Cozinha Central') {
        user.role = 'kitchen'
    }
    return { supabase, user }
}

/**
 * Busca todos os dados necessários para a tela de planejamento, 
 * considerando localizações e reserva de estoque.
 */
export async function getProductionPlanningDataAction(locationId?: string) {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'kitchen', 'manager'].includes(user.role)) throw new Error('Sem permissão')

        const locId = locationId || user.primary_group_id
        if (!locId) throw new Error('Localização (unidade) não identificada para este usuário.')

        // 1. Buscar pedidos internos de abastecimento pendentes para esta cozinha
        const { data: storeItems, error: itemsErr } = await supabase
            .from('purchase_order_items')
            .select(`
                item_id,
                requested_qty,
                purchase_orders!inner(id, status, order_type, destination_location_id)
            `)
            .in('purchase_orders.status', ['enviado', 'em_separacao'])
            .eq('purchase_orders.order_type', 'internal_replenishment')
            // Se quiser filtrar por source_location_id futuramente: .eq('purchase_orders.source_location_id', locId)
        
        if (itemsErr) throw itemsErr

        // Agrupar por item_id
        const aggregatedRequests: Record<string, { total: number; orderIds: string[] }> = {}
        storeItems?.forEach((si: any) => {
            if (!aggregatedRequests[si.item_id]) aggregatedRequests[si.item_id] = { total: 0, orderIds: [] }
            aggregatedRequests[si.item_id].total += Number(si.requested_qty)
            aggregatedRequests[si.item_id].orderIds.push(si.purchase_orders.id)
        })

        // 2. Buscar produção já programada (ordens pendentes ou em andamento nesta unidade)
        const { data: scheduledItems, error: scheduledErr } = await supabase
            .from('production_order_items')
            .select(`
                item_id,
                approved_qty,
                production_orders!inner(status, location_id)
            `)
            .eq('production_orders.location_id', locId)
            .in('production_orders.status', ['pending', 'in_progress'])
        
        if (scheduledErr) throw scheduledErr
        const scheduledMap: Record<string, number> = {}
        scheduledItems?.forEach((si: any) => {
            scheduledMap[si.item_id] = (scheduledMap[si.item_id] || 0) + Number(si.approved_qty)
        })

        // 3. Detalhes dos itens (agora precisamos saber tudo que foi pedido ou programado)
        const allRelevantItemIds = Array.from(new Set([
            ...Object.keys(aggregatedRequests),
            ...Object.keys(scheduledMap)
        ]))

        if (allRelevantItemIds.length === 0) return { success: true, data: [] }

        const { data: items, error: itemDetailsErr } = await supabase
            .from('purchase_items')
            .select('*')
            .in('id', allRelevantItemIds)
            .eq('is_active', true)
        
        if (itemDetailsErr) throw itemDetailsErr

        // 4. Buscar mapeamento de contagem para esses itens
        const { data: mappings } = await supabase
            .from('count_to_purchase_item_map')
            .select('count_item_id, purchase_item_id')
            .in('purchase_item_id', allRelevantItemIds)

        const purchaseToCountMap = new Map<string, string>()
        const countToPurchaseMap = new Map<string, string>()
        mappings?.forEach(m => {
            purchaseToCountMap.set(m.purchase_item_id, m.count_item_id)
            countToPurchaseMap.set(m.count_item_id, m.purchase_item_id)
        })

        // 5. Buscar o último estoque contado apenas para os itens que possuem mapeamento
        const countItemIds = Array.from(countToPurchaseMap.keys())
        const lastCountMap: Record<string, { qty: number; date: string; group_name?: string }> = {}

        if (countItemIds.length > 0) {
            const { data: countData } = await supabase
                .from('count_session_items')
                .select(`
                    item_id, counted_quantity, is_zeroed, validated_quantity, validated_is_zeroed,
                    count_sessions!inner(
                        completed_at, status,
                        groups!inner(name, macro_sector)
                    )
                `)
                .in('item_id', countItemIds)
                .eq('count_sessions.status', 'completed')
                .or('macro_sector.eq.Cozinha Central,name.ilike.CK%', { foreignTable: 'count_sessions.groups' })

            // Ordenar no JS (mais seguro e fácil dado as limitações de JOIN ordering)
            // Pegar sempre a data mais recente
            if (countData) {
                countData.sort((a: any, b: any) => new Date(b.count_sessions.completed_at).getTime() - new Date(a.count_sessions.completed_at).getTime())
                countData.forEach((c: any) => {
                    if (!lastCountMap[c.item_id]) {
                        const isZero = c.validated_is_zeroed ?? c.is_zeroed
                        const qty = isZero ? 0 : (c.validated_quantity ?? c.counted_quantity)
                        lastCountMap[c.item_id] = {
                            qty: Number(qty),
                            date: c.count_sessions.completed_at,
                            group_name: c.count_sessions.groups?.name
                        }
                    }
                })
            }
        }

        // 6. Montar sugestões
        const suggestions: ProductionSuggestion[] = items.map((item: any) => {
            const req = aggregatedRequests[item.id]?.total || 0
            const scheduled = scheduledMap[item.id] || 0
            
            let planning_category: 'production' | 'separation' | 'review' = 'review'
            let review_reason = ''

            // Regras de Classificação Simplificadas (sem usar recipes como prioridade)
            if (item.item_type === 'produced') {
                planning_category = 'production'
            } else if (item.item_type === 'separated') {
                planning_category = 'separation'
            } else {
                planning_category = 'review'
                review_reason = 'Item sem classificação no catálogo (item_type = unclassified).'
            }

            // Descobrir o estoque atual via contagem
            const countItemId = purchaseToCountMap.get(item.id)
            let ready_stock_qty = 0
            let last_count_date: string | undefined = undefined
            let count_group_name: string | undefined = undefined

            if (planning_category === 'production') {
                if (!countItemId) {
                    planning_category = 'review'
                    review_reason = 'Este item está marcado como produzido, mas ainda não está ligado a um item da contagem da Cozinha Central.'
                } else {
                    const stockData = lastCountMap[countItemId]
                    if (!stockData) {
                        planning_category = 'review'
                        review_reason = 'Item produzido não possui contagem recente finalizada na Cozinha Central.'
                    } else {
                        ready_stock_qty = stockData.qty
                        last_count_date = stockData.date
                        count_group_name = stockData.group_name
                    }
                }
            } else if (planning_category === 'separation') {
                // Se houver contagem mapeada, mostra como informativo, se não, mostra 0
                if (countItemId && lastCountMap[countItemId]) {
                    ready_stock_qty = lastCountMap[countItemId].qty
                    last_count_date = lastCountMap[countItemId].date
                }
            }

            // Produção Necessária
            const suggested = Math.max(0, req - ready_stock_qty - scheduled)

            return {
                id: item.id,
                purchase_order_id: aggregatedRequests[item.id]?.orderIds[0] || null,
                item_id: item.id,
                source_location_id: locId,
                requested_qty: req,
                ready_stock_qty,
                scheduled_qty: scheduled,
                suggested_qty: suggested,
                approved_qty: suggested,
                status: 'pending',
                calculated_at: new Date().toISOString(),
                item: { 
                    ...item, 
                    status_color: 'green' // Simplificado sem dependência de insumos (missingIngredients) nesta fase
                },
                planning_category,
                last_count_date,
                count_group_name,
                review_reason
            } as any
        })

        return { success: true, data: suggestions }
    } catch (e: any) {
        console.error('Erro em getProductionPlanningDataAction:', e)
        return { success: false, error: e.message }
    }
}

/**
 * Utilitário para padronizar unidades base (kg, L, un)
 */
function standardizeUnit(val: number, unit: string): { val: number, unit: string } {
    const u = unit.toLowerCase().trim()
    if (u === 'g' || u === 'gramas') return { val: val / 1000, unit: 'kg' }
    if (u === 'ml' || u === 'mililitros') return { val: val / 1000, unit: 'L' }
    if (u === 'kg' || u === 'l' || u === 'un') return { val, unit: u }
    return { val, unit } // mantém se desconhecido
}

/**
 * Aprova o planejamento e gera as ordens de produção de forma atômica via RPC.
 */
export async function approveProductionPlanningAction(
    locationId: string,
    approvedItems: Array<{ 
        item_id: string; 
        quantity: number; 
        suggested_qty: number;
        reason?: AdjustmentReason; 
        notes?: string;
        source_suggestion_id?: string;
    }>
) {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'kitchen', 'manager'].includes(user.role)) throw new Error('Sem permissão')

        // Chamar a função RPC transacional blindada
        const { data: orderId, error: rpcErr } = await supabase.rpc('approve_production_plan', {
            p_location_id: locationId,
            p_notes: 'Planejamento consolidado',
            p_items: approvedItems.map(i => ({
                item_id: i.item_id,
                quantity: i.quantity,
                suggested_qty: i.suggested_qty,
                reason: i.reason || null,
                notes: i.notes || null,
                source_suggestion_id: i.source_suggestion_id || null
            }))
        })

        if (rpcErr) throw rpcErr

        return { success: true, orderId }
    } catch (e: any) {
        console.error('Erro em approveProductionPlanningAction:', e)
        return { success: false, error: e.message }
    }
}

/**
 * Finaliza a produção de forma atômica via RPC.
 */
export async function completeProductionOrderAction(
    orderId: string,
    items: Array<{ 
        item_id: string; 
        produced_qty: number; 
        lost_qty: number 
    }>
) {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'kitchen', 'manager', 'operator'].includes(user.role)) throw new Error('Sem permissão')

        const { error: rpcErr } = await supabase.rpc('complete_production_order', {
            p_order_id: orderId,
            p_items: items
        })

        if (rpcErr) throw rpcErr

        return { success: true }
    } catch (e: any) {
        console.error('Erro em completeProductionOrderAction:', e)
        return { success: false, error: e.message }
    }
}

/**
 * Cancela uma ordem de produção de forma atômica via RPC.
 */
export async function cancelProductionOrderAction(orderId: string) {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'kitchen', 'manager'].includes(user.role)) throw new Error('Sem permissão')

        const { error: rpcErr } = await supabase.rpc('cancel_production_order', {
            p_order_id: orderId
        })

        if (rpcErr) throw rpcErr

        return { success: true }
    } catch (e: any) {
        console.error('Erro em cancelProductionOrderAction:', e)
        return { success: false, error: e.message }
    }
}

export async function getProductionOrderAction(orderId: string) {
    try {
        const { supabase } = await getCurrentUser()
        const { data, error } = await supabase
            .from('production_orders')
            .select(`
                *,
                production_order_items(
                    *,
                    purchase_items(*)
                )
            `)
            .eq('id', orderId)
            .single()
        
        if (error) throw error
        return { success: true, data }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// VÍNCULO MANUAL DE ITENS DA COZINHA CENTRAL
// ─────────────────────────────────────────────────────────────────────────────

export async function getCountItemsForLinkingAction(search: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
        const { supabase } = await getCurrentUser()
        const { data, error } = await supabase
            .from('items')
            .select('id, name, unit')
            .ilike('name', `%${search}%`)
            .order('name')
            .limit(20)

        if (error) throw error
        return { success: true, data }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}

export async function linkPurchaseToCountItemAction(purchaseItemId: string, countItemId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'manager', 'kitchen'].includes(user.role)) throw new Error('Sem permissão')

        // Tenta remover o vínculo antigo caso exista para evitar duplicatas, ou apenas faz um upsert
        const { error: delError } = await supabase
            .from('count_to_purchase_item_map')
            .delete()
            .eq('purchase_item_id', purchaseItemId)
        
        if (delError) throw delError

        const { error } = await supabase
            .from('count_to_purchase_item_map')
            .insert({
                purchase_item_id: purchaseItemId,
                count_item_id: countItemId
            })

        if (error) throw error

        return { success: true }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}

export async function unlinkPurchaseToCountItemAction(purchaseItemId: string): Promise<{ success: boolean; removedCountItemId?: string; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'manager', 'kitchen'].includes(user.role)) throw new Error('Sem permissão para desvincular itens.')

        // Buscar o vínculo atual para log
        const { data: existing } = await supabase
            .from('count_to_purchase_item_map')
            .select('count_item_id')
            .eq('purchase_item_id', purchaseItemId)
            .single()

        const { error } = await supabase
            .from('count_to_purchase_item_map')
            .delete()
            .eq('purchase_item_id', purchaseItemId)

        if (error) throw error

        console.log(`[unlink] user=${user.id} removed link purchase_item=${purchaseItemId} count_item=${existing?.count_item_id} at ${new Date().toISOString()}`)

        return { success: true, removedCountItemId: existing?.count_item_id }
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message }
    }
}
