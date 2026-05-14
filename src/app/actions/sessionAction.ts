'use server'

import { createClient } from '@supabase/supabase-js'
import { getAccessibleCountScope } from '@/lib/server-auth-context'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getScopedSessionsAction(filters: { 
    unitId?: string, 
    groupId?: string, 
    status?: string, 
    date?: string 
}) {
    try {
        const scope = await getAccessibleCountScope()
        
        let query = supabase
            .from('count_sessions')
            .select(`
                id, 
                status, 
                started_at, 
                completed_at, 
                validation_status,
                group_id,
                user_id,
                users!user_id!inner(name, unit_id, units(name)),
                groups!group_id!inner(name, macro_sector)
            `)
            .order('completed_at', { ascending: false })
            .limit(200)

        // ESCOPO DE SEGURANÇA
        if (scope.type === 'kitchen') {
            query = query.eq('groups.macro_sector', 'Cozinha Central')
        } else if (scope.type === 'store') {
            query = query.eq('users.unit_id', scope.unitId).neq('groups.macro_sector', 'Cozinha Central')
        }

        // FILTROS DO USUÁRIO
        if (filters.unitId) query = query.eq('users.unit_id', filters.unitId)
        if (filters.groupId) query = query.eq('group_id', filters.groupId)
        if (filters.status) query = query.eq('status', filters.status)
        if (filters.date) {
            query = query.gte('completed_at', `${filters.date}T00:00:00Z`)
            query = query.lte('completed_at', `${filters.date}T23:59:59Z`)
        }

        const { data, error } = await query
        if (error) throw error

        // Transformar para o formato esperado pelo componente (renomear joins se necessário)
        const sessions = data?.map((s: any) => {
            const groupData = Array.isArray(s.groups) ? s.groups[0] : s.groups
            const userData = Array.isArray(s.users) ? s.users[0] : s.users
            
            return {
                ...s,
                groups: { id: s.group_id, name: groupData?.name },
                users: { 
                    name: userData?.name, 
                    unit_id: userData?.unit_id, 
                    units: { name: userData?.units?.name } 
                }
            }
        })

        return { success: true, data: sessions || [] }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
