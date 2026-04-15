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
    
    // 3. Valida no perfil real do usuário
    const { data: usr, error } = await supabase.from('users').select('role').eq('id', userId).single()
    if (error || !usr) throw new Error("Erro ao validar credenciais do usuário.")
    if (usr.role !== 'admin' && usr.role !== 'manager') {
        throw new Error("Acesso negado: Perfil apenas de operador ou insuficiente.")
    }
    
    return userId
}

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
        const sessionIds = countSessions.map(s => s.id)
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
        snapshots.forEach(s => {
            allItemIds.add(s.item_id)
            const qty = s.theoretical_quantity || 0
            const cost = s.average_cost_snapshot || 0
            EI_map[s.item_id] = { qty, avg_cost: cost, val: qty * cost }
        })
    }

    if (entries) {
        entries.forEach(e => {
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
        const sessionIds = countSessions.map(s => s.id)
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
        snapshots.forEach(s => {
            allItemIds.add(s.item_id)
            const qty = s.theoretical_quantity || 0
            const cost = s.average_cost_snapshot || 0
            EI_map[s.item_id] = { qty, avg_cost: cost, val: qty * cost }
        })
    }

    if (entries) {
        entries.forEach(e => {
            allItemIds.add(e.item_id)
            const qty = Number(e.converted_quantity || 0)
            const val = qty * Number(e.converted_unit_cost || 0)
            if (!Compras_map[e.item_id]) Compras_map[e.item_id] = { qty: 0, val: 0 }
            Compras_map[e.item_id].qty += qty
            Compras_map[e.item_id].val += val
        })
    }

    Object.keys(EF_map).forEach(id => allItemIds.add(id))

    const details = []

    for (const itemId of Array.from(allItemIds)) {
        const itemObj = items?.find(i => i.id === itemId)
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

    details.sort((a, b) => b.cmv_item - a.cmv_item) // Ordena por maior cmv_item decrescente
    
    return { success: true, data: details }
}
