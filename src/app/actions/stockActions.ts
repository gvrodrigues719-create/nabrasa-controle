'use server'

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function addStockEntry(data: {
    executionId: string
    itemId: string
    quantityPurchased: number
    purchaseUnitPrice: number
    updateAvgCost?: boolean
    notes?: string
    createdBy?: string
}) {
    const { data: item, error: itemErr } = await supabase
        .from('items')
        .select('id, cost_mode, conversion_factor, unit, average_cost')
        .eq('id', data.itemId)
        .single()

    if (itemErr || !item) throw new Error('Item não encontrado.')

    let converted_quantity: number
    let converted_unit_cost: number
    let shouldUpdateAvgCost: boolean

    switch (item.cost_mode) {
        case 'conversion': {
            const factor = item.conversion_factor
            if (!factor || factor <= 0) throw new Error('Fator de conversão inválido para este item.')
            converted_quantity = data.quantityPurchased * factor
            converted_unit_cost = data.purchaseUnitPrice / factor
            shouldUpdateAvgCost = true
            break
        }
        case 'manual': {
            converted_quantity = data.quantityPurchased
            converted_unit_cost = data.purchaseUnitPrice
            shouldUpdateAvgCost = data.updateAvgCost ?? false
            break
        }
        default: {
            // direct
            converted_quantity = data.quantityPurchased
            converted_unit_cost = data.purchaseUnitPrice
            shouldUpdateAvgCost = true
            break
        }
    }

    const { data: entry, error: insertErr } = await supabase
        .from('stock_entries')
        .insert([{
            execution_id: data.executionId,
            item_id: data.itemId,
            quantity_purchased: data.quantityPurchased,
            purchase_unit_price: data.purchaseUnitPrice,
            converted_quantity,
            converted_unit_cost,
            update_avg_cost: shouldUpdateAvgCost,
            notes: data.notes || null,
            created_by: data.createdBy || null,
        }])
        .select('id')
        .single()

    if (insertErr) throw new Error('Erro ao registrar compra: ' + insertErr.message)

    if (shouldUpdateAvgCost) {
        // Buscar snapshot do item neste ciclo para base de cálculo
        const { data: snap } = await supabase
            .from('routine_theoretical_snapshot')
            .select('theoretical_quantity_snapshot, average_cost_snapshot')
            .eq('execution_id', data.executionId)
            .eq('item_id', data.itemId)
            .maybeSingle()

        // Buscar todas as compras anteriores deste item neste ciclo (incluindo a recém-inserida)
        const { data: allEntries } = await supabase
            .from('stock_entries')
            .select('converted_quantity, converted_unit_cost')
            .eq('execution_id', data.executionId)
            .eq('item_id', data.itemId)

        const baseQty = snap?.theoretical_quantity_snapshot ?? 0
        const baseCost = snap?.average_cost_snapshot ?? item.average_cost ?? 0
        const baseValue = baseQty * baseCost

        let totalPurchaseQty = 0
        let totalPurchaseValue = 0
        if (allEntries) {
            for (const e of allEntries) {
                totalPurchaseQty += Number(e.converted_quantity)
                totalPurchaseValue += Number(e.converted_quantity) * Number(e.converted_unit_cost)
            }
        }

        const poolQty = baseQty + totalPurchaseQty
        const poolValue = baseValue + totalPurchaseValue
        const newAvgCost = poolQty > 0 ? poolValue / poolQty : 0

        await supabase
            .from('items')
            .update({ average_cost: newAvgCost })
            .eq('id', data.itemId)
    }

    return { success: true, entryId: entry?.id }
}

export async function getStockEntries(executionId: string) {
    const { data, error } = await supabase
        .from('stock_entries')
        .select('*, items(name, unit, cost_mode, purchase_unit)')
        .eq('execution_id', executionId)
        .order('created_at', { ascending: false })

    if (error) throw new Error('Erro ao buscar compras: ' + error.message)
    return data || []
}

export async function deleteStockEntry(entryId: string) {
    const { error } = await supabase
        .from('stock_entries')
        .delete()
        .eq('id', entryId)

    if (error) throw new Error('Erro ao excluir compra: ' + error.message)
    return { success: true }
}
