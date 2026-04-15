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

export async function calculateCMV(executionId: string) {
    await requireManagerOrAdmin()

    const { data: execInfo } = await supabase.from('routine_executions').select('revenue, routine_id').eq('id', executionId).single()
    if (!execInfo) throw new Error("Routine execution não encontrada.")
    const routineId = execInfo.routine_id

    // 1. Buscar snapshots do ciclo (Estoque Inicial = EI)
    const { data: snapshots } = await supabase
        .from('routine_theoretical_snapshot')
        .select('item_id, theoretical_quantity, average_cost_snapshot')
        .eq('routine_id', routineId)

    // 2. Buscar compras agrupadas (Entradas)
    const { data: entries } = await supabase
        .from('stock_entries')
        .select('item_id, converted_quantity, converted_unit_cost, affects_avg_cost')
        .eq('execution_id', executionId)

    // 3. Buscar EF (Estoque Final) pela última sessão completed
    // Cuidado com count_session_items: precisamos associar via session_id
    const { data: countSessions } = await supabase
        .from('count_sessions')
        .select('id, completed_at')
        .eq('execution_id', executionId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })

    let EF_map: Record<string, number> = {}
    
    if (countSessions && countSessions.length > 0) {
        const sessionIds = countSessions.map((s: any) => s.id)
        // Precisamos processar do mais antigo para o mais novo para que o mais novo sobrescreva
        const sessDesc = [...sessionIds].reverse()
        
        for (const sId of sessDesc) {
            const { data: csi } = await supabase
                .from('count_session_items')
                .select('item_id, counted_quantity')
                .eq('session_id', sId)
            
            if (csi) {
                for (const item of csi) {
                    if (item.counted_quantity != null) {
                        EF_map[item.item_id] = item.counted_quantity
                    }
                }
            }
        }
    }

    // Unir todos os IDs
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

    // Calcula Totais
    let total_ei = 0
    let total_compras = 0
    let total_ef = 0
    let total_cmv = 0
    let uncounted_item_ids: string[] = []
    let anomaly_item_ids: string[] = []

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
            // Anomalia: não tinha no começo, não comprou, mas acha
            if (ei.qty <= 0 && comp.qty <= 0 && ef_qty > 0) {
                anomaly_item_ids.push(itemId)
            }
        } else {
            // Se esqueceu de contar e tinha estoque
            if (ei.qty > 0 || comp.qty > 0) {
                uncounted_item_ids.push(itemId)
            }
            // EF fica zero, gerando Perda Total no sistema se não for revisado.
        }

        const ef_val = ef_qty * custo_medio
        total_ef += ef_val

        const cmv_item = sum_val - ef_val
        total_cmv += cmv_item
    }

    const cmv_percentage = (execInfo.revenue || 0) > 0 ? total_cmv / execInfo.revenue! : null

    // Salvar agregados
    await supabase.from('routine_executions').update({
        cmv_total: total_cmv,
        cmv_percentage: cmv_percentage
    }).eq('id', executionId)

    return { 
        success: true, 
        data: {
            total_ei,
            total_compras,
            total_ef,
            total_cmv,
            cmv_percentage,
            revenue: execInfo.revenue || 0,
            uncounted_count: uncounted_item_ids.length,
            uncounted_item_ids,
            anomalies_count: anomaly_item_ids.length,
            anomaly_item_ids
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
        const sessDesc = [...sessionIds].reverse()
        for (const sId of sessDesc) {
            const { data: csi } = await supabase.from('count_session_items').select('item_id, counted_quantity').eq('session_id', sId)
            if (csi) {
                for (const item of csi) {
                    if (item.counted_quantity != null) EF_map[item.item_id] = item.counted_quantity
                }
            }
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

    for (const cycle of cycles) {
        // Aproveitamos a lógica de calculateCMV mas de forma otimizada para apenas pegar os counts
        // Nota: Em um sistema real com muitos dados, salvaríamos esses counts no banco no momento do fechamento.
        const res = await calculateCMV(cycle.id) // Recalcula para garantir counts atualizados (Action já existe)
        const counts = res.data

        const cyclePurchases = purchasesByExec[cycle.id] || 0
        
        cycleData.push({
            execution_id: cycle.id,
            name: (cycle.routines as any)?.name || 'Ciclo Sem Nome',
            date: cycle.started_at,
            revenue: cycle.revenue || 0,
            compras_total: cyclePurchases,
            cmv_total: cycle.cmv_total || 0,
            cmv_percentage: cycle.cmv_percentage,
            status: 'draft', // Simplificado
            anomalies_count: counts.anomalies_count,
            uncounted_count: counts.uncounted_count
        })

        revenueTotal += (cycle.revenue || 0)
        purchasesTotal += cyclePurchases
        cmvTotal += (cycle.cmv_total || 0)
        if (counts.anomalies_count > 0) cyclesWithAnomalies++
        if (counts.uncounted_count > 0) cyclesWithUncounted++
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

