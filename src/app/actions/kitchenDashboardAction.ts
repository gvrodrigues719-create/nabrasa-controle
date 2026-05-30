'use server'

import { createClient } from '@supabase/supabase-js'
import { getAccessibleCountScope } from '@/lib/server-auth-context'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface KitchenOperacaoData {
    pedidosAnalise: number
    producaoNecessaria: number
    separacaoNecessaria: number
    pedidosSeparadosHoje: number
    idadeContagemCK_horas: number | null
    ultimaContagemCK_at: string | null
    ultimaContagemCK_sessionId: string | null
    recebimentosAtrasados: number
    producedSemVinculoCount: number
    pedidosTesteCount: number
}

export interface HealthItem {
    id: string
    name: string
    category?: string
    suggestion?: string
}

export interface HealthPedidoTeste {
    id: string
    status: string
    notes: string
    created_at: string
}

export interface HealthLojaDesatualizada {
    unit_name: string
    last_count_at: string
    diffHoras: number
}

export interface HealthProducaoAberta {
    id: string
    status: string
    created_at: string
}

export interface KitchenSaudeData {
    unclassifiedCount: number
    unclassifiedItems: HealthItem[]
    producedSemVinculoCount: number
    producedSemVinculo: HealthItem[]
    itensParaRevisarCount: number
    pedidosTesteCount: number
    pedidosTeste: HealthPedidoTeste[]
    idadeContagemCK_horas: number | null
    ultimaContagemCK_at: string | null
    ultimaContagemCK_sessionId: string | null
    lojasDesatualizadas: HealthLojaDesatualizada[]
    producaoEmAbertoCount: number
    producaoEmAberto: HealthProducaoAberta[]
}

export interface KitchenDashboardResult {
    success: boolean
    error?: string
    operacao?: KitchenOperacaoData
    saude?: KitchenSaudeData
}

export async function getKitchenDashboardDataAction(): Promise<KitchenDashboardResult> {
    try {
        const scope = await getAccessibleCountScope()
        if (scope.type !== 'kitchen' && scope.type !== 'all') {
            return { success: false, error: 'Acesso negado.' }
        }

        // ─── Parallel queries ─────────────────────────────────────────────────
        const [
            pendingOrdersRes,
            allPurchaseItemsRes,
            lastCKCountRes,
            storeSessionsRes,
            unclassifiedRes,
            mappingsRes,
            pedidosTesteRes,
            producaoEmAbertoRes,
            overdueReceivingsRes,
        ] = await Promise.all([
            // 1. Pedidos pendentes (em_analise + enviado) do tipo internal_replenishment
            supabase
                .from('purchase_orders')
                .select('id, status, order_type')
                .in('status', ['enviado', 'em_analise', 'em_separacao'])
                .eq('order_type', 'internal_replenishment'),

            // 2. Todos os purchase_items com item_type
            supabase
                .from('purchase_items')
                .select('id, name, item_type, category'),

            // 3. Última contagem CK finalizada
            supabase
                .from('count_sessions')
                .select('id, completed_at, groups!inner(name, macro_sector)')
                .eq('status', 'completed')
                .eq('groups.macro_sector', 'Cozinha Central')
                .order('completed_at', { ascending: false })
                .limit(1),

            // 4. Últimas sessões de lojas (não-CK) para calcular lojas desatualizadas
            supabase
                .from('count_sessions')
                .select('id, completed_at, group_id, user_id, groups!inner(name, macro_sector)')
                .eq('status', 'completed')
                .or('macro_sector.neq.Cozinha Central,macro_sector.is.null', { foreignTable: 'groups' })
                .order('completed_at', { ascending: false }),

            // 5. Itens sem classificação
            supabase
                .from('purchase_items')
                .select('id, name, category')
                .eq('item_type', 'unclassified'),

            // 6. Mapeamentos existentes
            supabase
                .from('count_to_purchase_item_map')
                .select('purchase_item_id, count_item_id'),

            // 7. Pedidos de teste ativos
            supabase
                .from('purchase_orders')
                .select('id, status, notes, created_at')
                .not('status', 'in', '("cancelado","recebido")')
                .or('notes.ilike.%TESTE%,notes.ilike.%IGNORAR%,notes.ilike.%QA%'),

            // 8. Produções em aberto
            supabase
                .from('production_orders')
                .select('id, status, created_at')
                .in('status', ['pending', 'in_progress']),

            // 9. Recebimentos atrasados (scheduled com data anterior a hoje)
            supabase
                .from('ck_receivings')
                .select('id', { count: 'exact', head: true })
                .lt('delivery_date', new Date().toISOString().split('T')[0])
                .eq('status', 'scheduled'),
        ])

        // ─── Process purchase order items for planning snapshot ───────────────
        const pendingOrders = pendingOrdersRes.data ?? []
        const pendingOrderIds = pendingOrders.map(o => o.id)

        let producaoNecessaria = 0
        let separacaoNecessaria = 0
        let itensParaRevisarCount = 0

        if (pendingOrderIds.length > 0) {
            const { data: orderItems } = await supabase
                .from('purchase_order_items')
                .select('item_id, order_id')
                .in('order_id', pendingOrderIds)

            const allItems = allPurchaseItemsRes.data ?? []
            const itemMap = new Map(allItems.map(i => [i.id, i]))
            const uniqueItemIds = new Set(orderItems?.map(oi => oi.item_id) ?? [])

            uniqueItemIds.forEach(itemId => {
                const item = itemMap.get(itemId)
                if (!item || item.item_type === 'unclassified') itensParaRevisarCount++
                else if (item.item_type === 'produced') producaoNecessaria++
                else if (item.item_type === 'separated') separacaoNecessaria++
            })
        }

        // ─── Idade da contagem CK ─────────────────────────────────────────────
        const lastCKSessions = lastCKCountRes.data ?? []
        const lastCKSession = lastCKSessions[0] as any | null
        const ultimaContagemCK_at = lastCKSession?.completed_at ?? null
        const ultimaContagemCK_sessionId = lastCKSession?.id ?? null
        let idadeContagemCK_horas: number | null = null
        if (ultimaContagemCK_at) {
            idadeContagemCK_horas = (Date.now() - new Date(ultimaContagemCK_at).getTime()) / (1000 * 60 * 60)
        }

        // ─── Lojas desatualizadas ─────────────────────────────────────────────
        const storeSessions = storeSessionsRes.data ?? []
        const userIds = [...new Set(storeSessions.map((s: any) => s.user_id))]
        let lojasDesatualizadas = 0
        let lojasTotal = 0
        const lojasDesatualizadasList: HealthLojaDesatualizada[] = []

        if (userIds.length > 0) {
            const { data: usersData } = await supabase
                .from('users')
                .select('id, unit_id, name')
                .in('id', userIds)

            const unitIds = [...new Set(usersData?.map(u => u.unit_id).filter(Boolean) ?? [])]
            const { data: unitsData } = await supabase
                .from('groups')
                .select('id, name')
                .in('id', unitIds)

            const unitMap = new Map(unitsData?.map(u => [u.id, u]) ?? [])
            const userMap = new Map(usersData?.map(u => [u.id, { ...u, unit: unitMap.get(u.unit_id) }]) ?? [])

            // Deduplicate: latest session per unit
            const latestPerUnit = new Map<string, { last_count_at: string; unit_name: string }>()
            storeSessions.forEach((s: any) => {
                const user = userMap.get(s.user_id) as any
                if (!user?.unit_id || !user?.unit) return
                const key = user.unit_id
                if (!latestPerUnit.has(key) || new Date(s.completed_at) > new Date(latestPerUnit.get(key)!.last_count_at)) {
                    latestPerUnit.set(key, {
                        last_count_at: s.completed_at,
                        unit_name: (user.unit as any).name ?? 'Unidade'
                    })
                }
            })

            const now = Date.now()
            latestPerUnit.forEach(entry => {
                lojasTotal++
                const diffHoras = (now - new Date(entry.last_count_at).getTime()) / (1000 * 60 * 60)
                if (diffHoras > 72) {
                    lojasDesatualizadas++
                    lojasDesatualizadasList.push({
                        unit_name: entry.unit_name,
                        last_count_at: entry.last_count_at,
                        diffHoras: Math.round(diffHoras),
                    })
                }
            })
        }

        // ─── Saúde — itens sem classificação ─────────────────────────────────
        const unclassifiedItems: HealthItem[] = (unclassifiedRes.data ?? []).map(i => ({
            id: i.id,
            name: i.name,
            category: i.category ?? undefined,
            suggestion: guessItemType(i.category),
        }))

        // ─── Saúde — produced sem vínculo ────────────────────────────────────
        const allItems = allPurchaseItemsRes.data ?? []
        const mappedIds = new Set((mappingsRes.data ?? []).map(m => m.purchase_item_id))
        const producedSemVinculo: HealthItem[] = allItems
            .filter(i => i.item_type === 'produced' && !mappedIds.has(i.id))
            .map(i => ({ id: i.id, name: i.name, category: i.category ?? undefined }))

        // ─── Assemble result ──────────────────────────────────────────────────
        const pedidosAnalise = pendingOrders.filter(o => o.status === 'em_analise').length
        const todayStart = new Date()
        todayStart.setUTCHours(0, 0, 0, 0)
        const pedidosSeparadosHoje = (await supabase
            .from('purchase_orders')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'separado')
            .gte('updated_at', todayStart.toISOString())
        ).count ?? 0

        const operacao: KitchenOperacaoData = {
            pedidosAnalise,
            producaoNecessaria,
            separacaoNecessaria,
            pedidosSeparadosHoje,
            idadeContagemCK_horas,
            ultimaContagemCK_at,
            ultimaContagemCK_sessionId,
            recebimentosAtrasados: overdueReceivingsRes.count ?? 0,
            producedSemVinculoCount: producedSemVinculo.length,
            pedidosTesteCount: pedidosTesteRes.data?.length ?? 0,
        }

        const saude: KitchenSaudeData = {
            unclassifiedCount: unclassifiedItems.length,
            unclassifiedItems,
            producedSemVinculoCount: producedSemVinculo.length,
            producedSemVinculo,
            itensParaRevisarCount,
            pedidosTesteCount: pedidosTesteRes.data?.length ?? 0,
            pedidosTeste: (pedidosTesteRes.data ?? []) as HealthPedidoTeste[],
            idadeContagemCK_horas,
            ultimaContagemCK_at,
            ultimaContagemCK_sessionId,
            lojasDesatualizadas: lojasDesatualizadasList,
            producaoEmAbertoCount: producaoEmAbertoRes.data?.length ?? 0,
            producaoEmAberto: (producaoEmAbertoRes.data ?? []) as HealthProducaoAberta[],
        }

        return { success: true, operacao, saude }

    } catch (e: any) {
        console.error('[kitchenDashboardAction]', e)
        return { success: false, error: e.message }
    }
}

function guessItemType(category: string | null | undefined): string {
    if (!category) return 'Verificar manualmente'
    const cat = category.toUpperCase()
    if (['HORTIFRUTI', 'CONGELADOS', 'DESTILADOS E VINHOS', 'BEBIDAS', 'BAR', 'LIMPEZA', 'DESCARTÁVEIS', 'CONDIMENTOS'].includes(cat)) {
        return 'Sugestão: separated'
    }
    if (['PROTEÍNAS', 'CARNES', 'ESPETOS', 'MOLHOS', 'PREPAROS', 'ENTRADAS'].includes(cat)) {
        return 'Verificar: produced ou separated'
    }
    return 'Verificar manualmente'
}
