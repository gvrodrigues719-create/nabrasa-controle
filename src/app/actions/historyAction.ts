'use server'

import { createClient } from '@supabase/supabase-js'
import { getAccessibleCountScope } from '@/lib/server-auth-context'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getScopedExecutionHistoryAction(filters: { routineId?: string, from?: string, to?: string }) {
    try {
        const scope = await getAccessibleCountScope()
        
        let query = supabase.from('v_routine_execution_history').select('*')
        
        if (filters.routineId) query = query.eq('routine_id', filters.routineId)
        if (filters.from) query = query.gte('started_at', `${filters.from}T00:00:00Z`)
        if (filters.to) query = query.lte('started_at', `${filters.to}T23:59:59Z`)
        
        // ESCOPO DE SEGURANÇA
        // v_routine_execution_history não tem macro_sector diretamente, mas podemos filtrar as rotinas
        if (scope.type !== 'all') {
             const { data: routineGroups } = await supabase.from('routine_groups').select('routine_id, groups!inner(macro_sector)')
             const allowedRoutineIds = new Set(
                routineGroups
                    ?.filter(rg => {
                        const ms = rg.groups?.macro_sector
                        if (scope.type === 'kitchen') return ms === 'Cozinha Central'
                        if (scope.type === 'store') return ms !== 'Cozinha Central'
                        return true
                    })
                    .map(rg => rg.routine_id)
            )
            query = query.in('routine_id', Array.from(allowedRoutineIds))
        }

        const { data, error } = await query.order('started_at', { ascending: false }).limit(50)
        if (error) throw error
        
        return { success: true, data: data || [] }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
