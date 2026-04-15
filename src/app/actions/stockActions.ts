'use server'

import { createClient } from '@supabase/supabase-js'
import { getActiveOperator } from './pinAuth'
import { createServerClient } from '@/lib/supabase/server'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper para validar permissão
async function requireManagerOrAdmin() {
    let userId: string | null = null

    // 1. Tenta Auth nativo do Supabase primeiro via Server Client
    try {
        const supabaseServer = await createServerClient()
        const { data: { user } } = await supabaseServer.auth.getUser()
        if (user) {
            userId = user.id
        }
    } catch (e) {
        console.error("Falha ao consultar usuário via cookie Supabase:", e)
    }

    // 2. Fallback: Tenta Cookie PIN operacional caso Auth nativo falhe
    if (!userId) {
        const op = await getActiveOperator()
        if (op) userId = op.userId
    }

    if (!userId) {
        throw new Error("Usuário não autenticado no servidor.")
    }
    
    // 3. Valida ROLE absoluta no banco para o userId certificado
    const { data: usr, error } = await supabase.from('users').select('role').eq('id', userId).single()
    
    if (error || !usr) throw new Error("Erro ao validar credenciais do usuário.")
    if (usr.role !== 'admin' && usr.role !== 'manager') {
        throw new Error("Acesso negado: Perfil apenas de operador ou insuficiente.")
    }
    
    return userId
}

export async function addStockEntry(data: {
    executionId: string,
    itemId: string,
    quantityPurchased: number,
    purchaseUnitPrice: number,
    updateAvgCost?: boolean,
    notes?: string
}) {
    // 1. Extrair auth via servidor
    const userId = await requireManagerOrAdmin()

    // 2. Buscar informações do item
    const { data: item, error: itemErr } = await supabase
        .from('items')
        .select('cost_mode, unit, purchase_unit, conversion_factor, average_cost')
        .eq('id', data.itemId)
        .single()
        
    if (itemErr || !item) throw new Error("Item não encontrado.")

    // 3. Regras de conversão
    let converted_quantity = data.quantityPurchased
    let converted_unit_cost = data.purchaseUnitPrice
    let purchase_unit = item.unit
    let conversion_factor_used: number | null = null
    let affects_avg_cost = true
    let update_avg_cost = true

    if (item.cost_mode === 'direct') {
        // direct
        converted_quantity = data.quantityPurchased
        converted_unit_cost = data.purchaseUnitPrice
        purchase_unit = item.unit
        conversion_factor_used = null
        update_avg_cost = true
        affects_avg_cost = true

    } else if (item.cost_mode === 'conversion') {
        // conversion
        if (!item.conversion_factor) throw new Error("Fator de conversão não definido no item.")
        converted_quantity = data.quantityPurchased * item.conversion_factor
        converted_unit_cost = data.purchaseUnitPrice / item.conversion_factor
        purchase_unit = item.purchase_unit || item.unit
        conversion_factor_used = item.conversion_factor
        update_avg_cost = true
        affects_avg_cost = true

    } else if (item.cost_mode === 'manual') {
        // manual
        converted_quantity = data.quantityPurchased
        converted_unit_cost = data.purchaseUnitPrice
        purchase_unit = item.unit
        conversion_factor_used = null
        update_avg_cost = !!data.updateAvgCost
        affects_avg_cost = update_avg_cost
    }

    // 4. Inserir em stock_entries
    const { error: insErr } = await supabase.from('stock_entries').insert([{
        execution_id: data.executionId,
        item_id: data.itemId,
        quantity_purchased: data.quantityPurchased,
        purchase_unit,
        purchase_unit_price: data.purchaseUnitPrice,
        conversion_factor_used,
        converted_quantity,
        converted_unit_cost,
        update_avg_cost,
        affects_avg_cost,
        notes: data.notes || null,
        created_by: userId
    }])

    if (insErr) throw new Error(`Erro ao registrar compra: ${insErr.message}`)

    // 5. Recalcular average_cost se affects_avg_cost = true
    if (affects_avg_cost) {
        // 5.1 Buscar snapshot base do ciclo (theoretical qty + avg cost snapshot)
        const { data: snapshot } = await supabase
            .from('routine_theoretical_snapshot')
            .select('theoretical_quantity, average_cost_snapshot')
            .eq('routine_id', (await getRoutineIdFromExecution(data.executionId)) )
            .eq('item_id', data.itemId)
            .maybeSingle()

        const base_qty = snapshot?.theoretical_quantity || 0
        const base_val = base_qty * (snapshot?.average_cost_snapshot || 0)

        // 5.2 Buscar todas as entradas que afetam custo
        const { data: entries } = await supabase
            .from('stock_entries')
            .select('converted_quantity, converted_unit_cost')
            .eq('execution_id', data.executionId)
            .eq('item_id', data.itemId)
            .eq('affects_avg_cost', true)

        let compras_qty = 0
        let compras_val = 0

        if (entries) {
            for (const entry of entries) {
                compras_qty += Number(entry.converted_quantity || 0)
                compras_val += Number(entry.converted_quantity || 0) * Number(entry.converted_unit_cost || 0)
            }
        }

        const total_qty = base_qty + compras_qty
        const total_val = base_val + compras_val

        if (total_qty > 0) {
            const new_avg = total_val / total_qty
            await supabase.from('items').update({ average_cost: new_avg }).eq('id', data.itemId)
        }
    }

    return { success: true }
}

export async function getStockEntries(executionId: string) {
    const { data, error } = await supabase
        .from('stock_entries')
        .select(`
            *,
            items (name, unit, cost_mode)
        `)
        .eq('execution_id', executionId)
        .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return { success: true, data }
}

export async function deleteStockEntry(entryId: string) {
    // Apenas validação de segurança (sem necessidade de resgatar o userId retornado)
    await requireManagerOrAdmin()

    // Deleção simples da entrada sem recálculo retroativo estrito (limitação conhecida do MVP)
    const { error } = await supabase.from('stock_entries').delete().eq('id', entryId)
    if (error) throw new Error(error.message)

    return { success: true }
}

// Util interno
async function getRoutineIdFromExecution(execId: string) {
    const { data } = await supabase.from('routine_executions').select('routine_id').eq('id', execId).single()
    return data?.routine_id
}
