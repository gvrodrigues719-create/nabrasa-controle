'use server'

import { createClient } from '@supabase/supabase-js'
import { getAccessibleCountScope } from '@/lib/server-auth-context'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getKitchenStoreStockAction() {
    try {
        const scope = await getAccessibleCountScope()
        
        // Segurança: Somente kitchen ou admin
        if (scope.type !== 'kitchen' && scope.type !== 'all') {
            return { success: false, error: 'Acesso negado: Perfil não autorizado.' }
        }

        // 1. Buscar sessões finalizadas de lojas
        const { data: sessions, error: sessionsError } = await supabase
            .from('count_sessions')
            .select(`
                id,
                completed_at,
                group_id,
                groups!inner(name, macro_sector),
                user_id,
                users!inner(name, unit_id, units!inner(name))
            `)
            .eq('status', 'completed')
            .neq('groups.macro_sector', 'Cozinha Central')
            .order('completed_at', { ascending: false })

        if (sessionsError) throw sessionsError

        // 2. Deduplicar: manter apenas a última contagem de cada unidade/grupo
        const latestSessionsMap = new Map()
        sessions?.forEach(s => {
            const unitId = (s.users as any)?.unit_id
            const groupId = s.group_id
            const key = `${unitId}-${groupId}`
            if (!latestSessionsMap.has(key)) {
                latestSessionsMap.set(key, s)
            }
        })

        const latestSessions = Array.from(latestSessionsMap.values())
        const sessionIds = latestSessions.map(s => s.id)

        if (sessionIds.length === 0) {
            return { success: true, units: [] }
        }

        // 3. Buscar itens das sessões selecionadas
        const { data: sessionItems, error: itemsError } = await supabase
            .from('count_session_items')
            .select(`
                session_id,
                item_id,
                counted_quantity,
                validated_quantity,
                is_zeroed,
                validated_is_zeroed,
                items!inner(name, unit)
            `)
            .in('session_id', sessionIds)

        if (itemsError) throw itemsError

        // 4. Estruturar dados por unidade e grupo
        const unitsMap = new Map()

        latestSessions.forEach(s => {
            const userData = s.users as any
            const unitId = userData.unit_id
            const unitName = userData.units.name
            const groupData = s.groups as any
            const groupId = s.group_id
            const groupName = groupData.name

            if (!unitsMap.has(unitId)) {
                unitsMap.set(unitId, {
                    unit_id: unitId,
                    unit_name: unitName,
                    last_count_at: s.completed_at,
                    groups: new Map()
                })
            }

            const unit = unitsMap.get(unitId)
            
            // Atualizar data da última contagem geral da unidade
            if (new Date(s.completed_at) > new Date(unit.last_count_at)) {
                unit.last_count_at = s.completed_at
            }

            if (!unit.groups.has(groupId)) {
                unit.groups.set(groupId, {
                    group_id: groupId,
                    group_name: groupName,
                    last_count_at: s.completed_at,
                    items: []
                })
            }

            const group = unit.groups.get(groupId)
            
            // Adicionar itens deste grupo
            const itemsInGroup = sessionItems
                ?.filter(si => si.session_id === s.id)
                .map(si => {
                    const itemData = si.items as any
                    const isZeroed = si.validated_is_zeroed !== null ? si.validated_is_zeroed : si.is_zeroed
                    const quantity = isZeroed ? 0 : (si.validated_quantity !== null ? si.validated_quantity : si.counted_quantity)
                    
                    return {
                        item_id: si.item_id,
                        item_name: itemData.name,
                        unit: itemData.unit,
                        quantity: quantity,
                        is_zeroed: isZeroed,
                        effective_quantity: quantity,
                        counted_at: s.completed_at,
                        responsible_name: userData.name,
                        session_id: s.id
                    }
                })

            group.items = itemsInGroup
        })

        // Converter Maps para Arrays e calcular Freshness
        const now = new Date()
        const result = Array.from(unitsMap.values()).map(u => {
            const lastCountDate = new Date(u.last_count_at)
            const diffHours = (now.getTime() - lastCountDate.getTime()) / (1000 * 60 * 60)
            
            let freshness = 'updated'
            if (diffHours > 72) freshness = 'outdated'
            else if (diffHours > 24) freshness = 'attention'

            return {
                ...u,
                freshness_status: freshness,
                groups: Array.from(u.groups.values())
            }
        })

        return { success: true, units: result }

    } catch (e: any) {
        console.error('Error in getKitchenStoreStockAction:', e)
        return { success: false, error: e.message }
    }
}
