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

        // 2. Buscar estoque disponível (finished) na localização
        // available = quantity - reserved_qty
        const { data: stock, error: stockErr } = await supabase
            .from('inventory_balances')
            .select('*')
            .eq('location_id', locId)
            .eq('type', 'finished')
        
        if (stockErr) throw stockErr
        const stockMap: Record<string, { quantity: number; reserved: number }> = {}
        stock?.forEach((s: any) => stockMap[s.item_id] = { quantity: Number(s.quantity), reserved: Number(s.reserved_qty) })

        // 3. Buscar produção já programada (ordens pendentes ou em andamento nesta unidade)
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

        // 4. Detalhes dos itens e receitas
        const allRelevantItemIds = Array.from(new Set([
            ...Object.keys(aggregatedRequests),
            ...Object.keys(stockMap),
            ...Object.keys(scheduledMap)
        ]))

        if (allRelevantItemIds.length === 0) return { success: true, data: [] }

        const { data: items, error: itemDetailsErr } = await supabase
            .from('purchase_items')
            .select('*')
            .in('id', allRelevantItemIds)
            .eq('is_active', true)
        
        if (itemDetailsErr) throw itemDetailsErr

        // 5. Receitas e Insumos Brutos (para cálculo de falta 'W')
        const { data: recipes } = await supabase.from('recipes').select('*, ingredient:purchase_items!ingredient_id(*)')
        const { data: rawStock } = await supabase.from('inventory_balances').select('*').eq('location_id', locId).eq('type', 'raw')
        const rawStockMap: Record<string, { quantity: number; reserved: number }> = {}
        rawStock?.forEach((s: any) => rawStockMap[s.item_id] = { quantity: Number(s.quantity), reserved: Number(s.reserved_qty) })

        // 6. Montar sugestões com a "Frase de Experiência" em mente
        const suggestions: ProductionSuggestion[] = items.map((item: any) => {
            const req = aggregatedRequests[item.id]?.total || 0
            const stockData = stockMap[item.id] || { quantity: 0, reserved: 0 }
            const available = Math.max(0, stockData.quantity - stockData.reserved)
            const scheduled = scheduledMap[item.id] || 0
            const suggested = Math.max(0, req - available - scheduled)

            const itemRecipes = (recipes ?? []).filter((r: any) => r.product_id === item.id)
            
            let status_color = 'green'
            let missingIngredients: string[] = []

            if (available < req) {
                status_color = 'yellow'
                if (suggested > 0) {
                    for (const r of itemRecipes) {
                        const need = (suggested * Number(r.quantity)) / (Number(r.yield_percentage || 100) / 100)
                        const ingStock = rawStockMap[r.ingredient_id] || { quantity: 0, reserved: 0 }
                        const ingAvailable = ingStock.quantity - ingStock.reserved
                        if (ingAvailable < need) {
                            status_color = 'red'
                            missingIngredients.push(r.ingredient?.name || 'Insumo')
                        }
                    }
                }
            }

            return {
                id: item.id,
                purchase_order_id: aggregatedRequests[item.id]?.orderIds[0] || null,
                item_id: item.id,
                source_location_id: locId,
                requested_qty: req,
                ready_stock_qty: available,
                scheduled_qty: scheduled,
                suggested_qty: suggested,
                approved_qty: suggested,
                status: 'pending',
                calculated_at: new Date().toISOString(),
                item: { 
                    ...item, 
                    status_color,
                    missing_ingredients: missingIngredients // Para a frase "falta comprar W"
                }
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
