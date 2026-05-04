'use server'

import { createClient } from '@supabase/supabase-js'

const supabase = new Proxy({} as any, {
    get(target, prop) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!url || !key) throw new Error("Ambiente Vercel incompleto: Faltam chaves de banco de dados.")
        const client = createClient(url, key)
        const value = client[prop as keyof typeof client]
        return typeof value === 'function' ? value.bind(client) : value
    }
})

import { requireManagerOrAdmin } from '@/lib/auth-utils'



export async function saveRevenue(executionId: string, revenue: number) {
    await requireManagerOrAdmin()
    
    // O cálculo de % depende de atualizar a revenue e em seguida o cmv_percentage.
    // Lemos antes para ver se já existe cmv calculado:
    const { data: exec } = await supabase.from('routine_executions').select('cmv_total').eq('id', executionId).single()
    
    const payload: any = { revenue }
    
    if (exec && exec.cmv_total != null) {
        if (revenue > 0) {
            payload.cmv_percentage = exec.cmv_total / revenue
        } else {
            payload.cmv_percentage = null
        }
    }

    const { error } = await supabase.from('routine_executions').update(payload).eq('id', executionId)
    if (error) throw new Error(error.message)
    
    return { success: true }
}

export async function getCMVTarget() {
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'cmv_target').maybeSingle()
    if (data?.value?.percentage != null) return data.value.percentage as number
    return 0.30 // default fallback
}

export async function setCMVTarget(percentage: number) {
    await requireManagerOrAdmin()
    const { error } = await supabase.from('app_settings').upsert({
        key: 'cmv_target',
        value: { percentage }
    }, { onConflict: 'key' })
    if (error) throw new Error(error.message)
    return { success: true }
}

/**
 * Helper interno para calcular CMV de um ciclo de forma otimizada.
 * Reduz roundtrips com o banco usando queries bulk para EF (Estoque Final).
 */
async function buildCMVCalculation(executionId: string, routineId: string) {
    // 1. Buscar snapshots do ciclo (Estoque Inicial = EI)
    const { data: snapshots } = await supabase
        .from('routine_theoretical_snapshot')
        .select('item_id, theoretical_quantity, average_cost_snapshot')
        .eq('routine_id', routineId)

    // 2. Buscar compras agrupadas (Entradas)
    const { data: entries } = await supabase
        .from('stock_entries')
        .select('item_id, converted_quantity, converted_unit_cost')
        .eq('execution_id', executionId)

    // 3. Buscar EF (Estoque Final) pela última sessão completed
    const { data: countSessions } = await supabase
        .from('count_sessions')
        .select('id, completed_at')
        .eq('execution_id', executionId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })

    const EF_map: Record<string, number> = {}

    if (countSessions && countSessions.length > 0) {
        const sessionIds = countSessions.map((s: any) => s.id)
        const sessionOrder = new Map<string, number>()
        sessionIds.forEach((id: string, idx: number) => sessionOrder.set(id, idx))

        // Busca todos os itens de todas as sessões do ciclo em uma ÚNICA query
        const { data: allCountedItems } = await supabase
            .from('count_session_items')
            .select('session_id, item_id, counted_quantity')
            .in('session_id', sessionIds)

        if (allCountedItems && allCountedItems.length > 0) {
            // Processa em memória: o item da sessão mais recente (menor index no sessionIds) vence
            allCountedItems
                .filter((i: any) => i.counted_quantity != null)
                .sort((a: any, b: any) => (sessionOrder.get(b.session_id) || 0) - (sessionOrder.get(a.session_id) || 0))
                .forEach((item: any) => {
                    // map.set sobrescreve se já existir, mas aqui queremos manter o mais novo
                    // Como sortemos por index decrescente, o mais novo (index 0) será processado por último e ficará no map
                    EF_map[item.item_id] = Number(item.counted_quantity)
                })
        }
    }

    const allItemIds = new Set<string>()
    const EI_map: Record<string, { qty: number, avg_cost: number, val: number }> = {}
    const Compras_map: Record<string, { qty: number, val: number }> = {}

    if (snapshots) {
        snapshots.forEach((s: any) => {
            allItemIds.add(s.item_id)
            const qty = s.theoretical_quantity || 0
            const cost = s.average_cost_snapshot || 0
            EI_map[s.item_id] = { qty, avg_cost: cost, val: qty * cost }
        })
    }

    if (entries) {
        entries.forEach((e: any) => {
            allItemIds.add(e.item_id)
            const qty = Number(e.converted_quantity || 0)
            const val = qty * Number(e.converted_unit_cost || 0)
            if (!Compras_map[e.item_id]) Compras_map[e.item_id] = { qty: 0, val: 0 }
            Compras_map[e.item_id].qty += qty
            Compras_map[e.item_id].val += val
        })
    }

    Object.keys(EF_map).forEach(id => allItemIds.add(id))

    let total_ei = 0
    let total_compras = 0
    let total_ef = 0
    let total_cmv = 0
    const uncounted_item_ids: string[] = []
    const anomaly_item_ids: string[] = []

    for (const itemId of Array.from(allItemIds)) {
        const ei = EI_map[itemId] || { qty: 0, val: 0, avg_cost: 0 }
        const comp = Compras_map[itemId] || { qty: 0, val: 0 }

        const sum_qty = ei.qty + comp.qty
        const sum_val = ei.val + comp.val
        const custo_medio = sum_qty > 0 ? (sum_val / sum_qty) : ei.avg_cost

        total_ei += ei.val
        total_compras += comp.val

        const was_counted = EF_map.hasOwnProperty(itemId)
        let ef_qty = 0

        if (was_counted) {
            ef_qty = EF_map[itemId]
            if (ei.qty <= 0 && comp.qty <= 0 && ef_qty > 0) {
                anomaly_item_ids.push(itemId)
            }
        } else if (ei.qty > 0 || comp.qty > 0) {
            uncounted_item_ids.push(itemId)
        }

        const ef_val = ef_qty * custo_medio
        total_ef += ef_val

        const cmv_item = sum_val - ef_val
        total_cmv += cmv_item
    }

    return {
        total_ei,
        total_compras,
        total_ef,
        total_cmv,
        uncounted_item_ids,
        anomaly_item_ids
    }
}

export async function calculateCMV(executionId: string) {
    await requireManagerOrAdmin()

    const { data: execInfo } = await supabase.from('routine_executions').select('revenue, routine_id').eq('id', executionId).single()
    if (!execInfo) throw new Error("Routine execution não encontrada.")

    const results = await buildCMVCalculation(executionId, execInfo.routine_id)

    const cmv_percentage = (execInfo.revenue || 0) > 0 ? results.total_cmv / execInfo.revenue! : null

    // Salvar agregados
    await supabase.from('routine_executions').update({
        cmv_total: results.total_cmv,
        cmv_percentage: cmv_percentage
    }).eq('id', executionId)

    return { 
        success: true, 
        data: {
            ...results,
            cmv_percentage,
            revenue: execInfo.revenue || 0,
            uncounted_count: results.uncounted_item_ids.length,
            anomalies_count: results.anomaly_item_ids.length
        }
    }
}

export async function getCMVSummary(executionId: string) {
    // Mesma logica compacta apenas para recuperar a tela caso não queiram apertar "Recalcular"
    const { data: exec } = await supabase.from('routine_executions').select('revenue, cmv_total, cmv_percentage').eq('id', executionId).single()
    return { success: true, data: exec }
}

export async function getCMVItemDetail(executionId: string) {
    await requireManagerOrAdmin()

    const { data: execInfo } = await supabase.from('routine_executions').select('routine_id').eq('id', executionId).single()
    if (!execInfo) throw new Error("Routine execution não encontrada.")
    const routineId = execInfo.routine_id

    // Fetch items with groups
    const { data: items } = await supabase.from('items').select('id, name, unit, groups(name)')

    // 1. EI
    const { data: snapshots } = await supabase.from('routine_theoretical_snapshot').select('item_id, theoretical_quantity, average_cost_snapshot').eq('routine_id', routineId)
    // 2. Compras
    const { data: entries } = await supabase.from('stock_entries').select('item_id, converted_quantity, converted_unit_cost').eq('execution_id', executionId)
    // 3. EF
    const { data: countSessions } = await supabase.from('count_sessions').select('id').eq('execution_id', executionId).eq('status', 'completed').order('completed_at', { ascending: false })

    let EF_map: Record<string, number> = {}
    if (countSessions && countSessions.length > 0) {
        const sessionIds = countSessions.map((s: any) => s.id)
        const sessionOrder = new Map<string, number>()
        sessionIds.forEach((id: string, idx: number) => sessionOrder.set(id, idx))

        const { data: allCountedItems } = await supabase
            .from('count_session_items')
            .select('session_id, item_id, counted_quantity')
            .in('session_id', sessionIds)

        if (allCountedItems && allCountedItems.length > 0) {
            allCountedItems
                .filter((i: any) => i.counted_quantity != null)
                .sort((a: any, b: any) => (sessionOrder.get(b.session_id) || 0) - (sessionOrder.get(a.session_id) || 0))
                .forEach((item: any) => {
                    if (!EF_map.hasOwnProperty(item.item_id)) {
                        EF_map[item.item_id] = Number(item.counted_quantity)
                    }
                })
        }
    }

    const allItemIds = new Set<string>()
    const EI_map: Record<string, { qty: number, avg_cost: number, val: number }> = {}
    const Compras_map: Record<string, { qty: number, val: number }> = {}

    if (snapshots) {
        snapshots.forEach((s: any) => {
            allItemIds.add(s.item_id)
            const qty = s.theoretical_quantity || 0
            const cost = s.average_cost_snapshot || 0
            EI_map[s.item_id] = { qty, avg_cost: cost, val: qty * cost }
        })
    }

    if (entries) {
        entries.forEach((e: any) => {
            allItemIds.add(e.item_id)
            const qty = Number(e.converted_quantity || 0)
            const val = qty * Number(e.converted_unit_cost || 0)
            if (!Compras_map[e.item_id]) Compras_map[e.item_id] = { qty: 0, val: 0 }
            Compras_map[e.item_id].qty += qty
            Compras_map[e.item_id].val += val
        })
    }

    Object.keys(EF_map).forEach((id: any) => allItemIds.add(id))

    const details = []

    for (const itemId of Array.from(allItemIds)) {
        const itemObj = items?.find((i: any) => i.id === itemId)
        if (!itemObj) continue

        const ei = EI_map[itemId] || { qty: 0, val: 0, avg_cost: 0 }
        const comp = Compras_map[itemId] || { qty: 0, val: 0 }
        
        const sum_qty = ei.qty + comp.qty
        const sum_val = ei.val + comp.val
        const custo_medio = sum_qty > 0 ? (sum_val / sum_qty) : ei.avg_cost

        const was_counted = EF_map.hasOwnProperty(itemId)
        let ef_qty = 0
        let is_anomaly = false

        if (was_counted) {
            ef_qty = EF_map[itemId]
            if (ei.qty <= 0 && comp.qty <= 0 && ef_qty > 0) is_anomaly = true
        } else {
            // se esquecido de contar, mantem ef_qty 0
            if (ei.qty <= 0 && comp.qty <= 0) {
                // não aparece no relatorio se não tem movimentação e não foi contado
                continue;
            }
        }

        const ef_val = ef_qty * custo_medio
        const cmv_item = sum_val - ef_val

        details.push({
            item_id: itemId,
            item_name: itemObj.name,
            item_unit: itemObj.unit,
            group_name: (itemObj.groups as any)?.name || 'Sem Grupo',
            ei_qty: ei.qty,
            ei_valor: ei.val,
            compras_qty: comp.qty,
            compras_valor: comp.val,
            custo_medio: custo_medio,
            ef_qty: ef_qty,
            ef_valor: ef_val,
            cmv_item: cmv_item,
            was_counted: was_counted,
            is_anomaly: is_anomaly
        })
    }

    details.sort((a: any, b: any) => b.cmv_item - a.cmv_item) // Ordena por maior cmv_item decrescente
    
    return { success: true, data: details }
}

export async function getCMVConsolidated(filter: { mode: '4' | '6' | 'month' | 'custom', startDate?: string, endDate?: string }) {
    await requireManagerOrAdmin()

    let query = supabase
        .from('routine_executions')
        .select('id, started_at, revenue, cmv_total, cmv_percentage, routines(name)')
        .order('started_at', { ascending: false })

    if (filter.mode === '4') query = query.limit(4)
    else if (filter.mode === '6') query = query.limit(6)
    else if (filter.mode === 'month') {
        const firstDay = new Date()
        firstDay.setDate(1)
        firstDay.setHours(0, 0, 0, 0)
        query = query.gte('started_at', firstDay.toISOString())
    } else if (filter.mode === 'custom' && filter.startDate && filter.endDate) {
        query = query.gte('started_at', filter.startDate).lte('started_at', filter.endDate)
    }

    const { data: cycles, error: cyclesError } = await query
    if (cyclesError) throw new Error(cyclesError.message)
    if (!cycles || cycles.length === 0) {
        return { success: true, data: { cycles: [], summary: null } }
    }

    const execIds = cycles.map((c: any) => c.id)

    // 1. Compras por ciclo
    const { data: allEntries } = await supabase
        .from('stock_entries')
        .select('execution_id, converted_quantity, converted_unit_cost')
        .in('execution_id', execIds)
    
    const purchasesByExec: Record<string, number> = {}
    allEntries?.forEach((e: any) => {
        const val = Number(e.converted_quantity || 0) * Number(e.converted_unit_cost || 0)
        purchasesByExec[e.execution_id] = (purchasesByExec[e.execution_id] || 0) + val
    })

    // 2. Alertas (Anomalias e Não Contados)
    // Para simplificar e evitar queries excessivas no resumo, buscamos apenas contadores brutos
    // onde o valor de anomalia é detectado se o item aparece em EF mas não em EI/Compras.
    // Como a lógica completa é pesada, calcularemos dinamicamente para os ciclos selecionados.
    
    const cycleData = []
    let revenueTotal = 0
    let purchasesTotal = 0
    let cmvTotal = 0
    let cyclesWithAnomalies = 0
    let cyclesWithUncounted = 0

    // Paraleliza o cálculo de todos os ciclos usando Promise.all
    // Isso reduz drásticamente a latência "sincronizando"
    const cycleCalculations = await Promise.all(
        cycles.map(async (cycle: any) => ({
            cycle,
            results: await buildCMVCalculation(cycle.id, cycle.routine_id)
        }))
    )

    for (const { cycle, results } of cycleCalculations) {
        const cyclePurchases = purchasesByExec[cycle.id] || 0
        const cycleCmvTotal = results.total_cmv
        const cycleCmvPercentage = (cycle.revenue || 0) > 0 ? cycleCmvTotal / cycle.revenue : null
        
        cycleData.push({
            execution_id: cycle.id,
            name: (cycle.routines as any)?.name || 'Ciclo Sem Nome',
            date: cycle.started_at,
            revenue: cycle.revenue || 0,
            compras_total: cyclePurchases,
            cmv_total: cycleCmvTotal,
            cmv_percentage: cycleCmvPercentage,
            status: 'preview', // Status padrão para visão consolidada
            anomalies_count: results.anomaly_item_ids.length,
            uncounted_count: results.uncounted_item_ids.length
        })

        revenueTotal += (cycle.revenue || 0)
        purchasesTotal += cyclePurchases
        cmvTotal += cycleCmvTotal
        if (results.anomaly_item_ids.length > 0) cyclesWithAnomalies++
        if (results.uncounted_item_ids.length > 0) cyclesWithUncounted++
    }

    const cmvTarget = await getCMVTarget()

    return {
        success: true,
        data: {
            cycles: cycleData,
            summary: {
                revenue_total: revenueTotal,
                purchases_total: purchasesTotal,
                cmv_total: cmvTotal,
                cmv_percentage_consolidated: revenueTotal > 0 ? cmvTotal / revenueTotal : null,
                target: cmvTarget,
                gap: revenueTotal > 0 ? (cmvTotal / revenueTotal) - cmvTarget : 0,
                cycles_count: cycles.length,
                cycles_with_anomalies: cyclesWithAnomalies,
                cycles_with_uncounted: cyclesWithUncounted
            }
        }
    }
}

/**
 * Retorna o status de CMV de forma pública (para o painel do funcionário)
 * Sem expor detalhes financeiros sensíveis.
 */
export async function getPublicCMVStatusAction() {
    try {
        // Busca a última execução concluída
        const { data: lastExec } = await supabase
            .from('routine_executions')
            .select('cmv_percentage, started_at')
            .not('cmv_percentage', 'is', null)
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        const target = await getCMVTarget()
        
        let status: 'good' | 'warning' | 'critical' = 'good'
        let message = 'Operação saudável e dentro da meta.'

        if (lastExec?.cmv_percentage) {
            const perc = lastExec.cmv_percentage
            if (perc > target + 0.05) {
                status = 'critical'
                message = 'Atenção: Estamos acima da meta da semana.'
            } else if (perc > target) {
                status = 'warning'
                message = 'Estamos próximos ao limite da meta.'
            }
        }

        return {
            success: true,
            data: {
                current: lastExec?.cmv_percentage || 0,
                target: target,
                status: status,
                message: message
            }
        }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}
