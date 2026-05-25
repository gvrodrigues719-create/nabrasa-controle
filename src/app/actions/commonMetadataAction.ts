'use server'

import { createClient } from '@supabase/supabase-js'
import { getAccessibleCountScope } from '@/lib/server-auth-context'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getScopedFilterMetadataAction() {
    try {
        const scope = await getAccessibleCountScope()
        
        // 1. Fetch Units (Stored in groups table)
        let unitsQuery = supabase.from('groups').select('id, name').eq('type', 'unit').order('name')
        if (scope.type === 'store') {
            unitsQuery = unitsQuery.eq('id', scope.unitId)
        } else if (scope.type === 'kitchen') {
            // Kitchen doesn't really have a unit_id, usually it's null or global
            // For now, let's keep it global for kitchen managers or filtered by null
        }
        
        // 2. Fetch Groups
        let groupsQuery = supabase.from('groups').select('id, name, macro_sector').order('name')
        if (scope.type === 'kitchen') {
            groupsQuery = groupsQuery.eq('macro_sector', 'Cozinha Central')
        } else if (scope.type === 'store') {
            groupsQuery = groupsQuery.or('macro_sector.neq.Cozinha Central,macro_sector.is.null')
        }

        // 3. Fetch Routines
        let routinesQuery = supabase.from('routines').select('id, name').eq('active', true).order('name')
        // Scoping routines is harder because they are not directly linked to groups in a simple way
        // But we can filter those that have at least one group in scope
        const { data: routineGroups } = await supabase.from('routine_groups').select('routine_id, group_id, groups!inner(macro_sector)')
        
        const [unitsRes, groupsRes, routinesRes] = await Promise.all([
            unitsQuery,
            groupsQuery,
            routinesQuery
        ])

        let filteredRoutines = routinesRes.data || []
        if (scope.type !== 'all') {
            const allowedRoutineIds = new Set(
                routineGroups
                    ?.filter(rg => {
                        const groupData = Array.isArray(rg.groups) ? rg.groups[0] : rg.groups as any
                        const ms = groupData?.macro_sector
                        if (scope.type === 'kitchen') return ms === 'Cozinha Central'
                        if (scope.type === 'store') return ms !== 'Cozinha Central'
                        return true
                    })
                    .map(rg => rg.routine_id)
            )
            filteredRoutines = filteredRoutines.filter(r => allowedRoutineIds.has(r.id))
        }

        return {
            success: true,
            units: unitsRes.data || [],
            groups: groupsRes.data || [],
            routines: filteredRoutines
        }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
