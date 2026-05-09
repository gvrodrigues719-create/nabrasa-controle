'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getActiveOperator } from '@/app/actions/pinAuth'

export async function getKitchenSessionHistoryAction(filters: { date?: string, groupId?: string }) {
    const supabase = await createServerClient()

    // 1. Validar se o usuário tem acesso à Cozinha Central (Pelo Operador ou Web Auth)
    const op = await getActiveOperator()
    
    let userId = op?.userId
    let userRole = op?.role
    let userName = op?.name

    if (!op) {
        // Fallback para Web Auth (Admin)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Não autenticado' }
        
        const { data: userData } = await supabase
            .from('users')
            .select('role, name')
            .eq('id', user.id)
            .single()
        
        userId = user.id
        userRole = userData?.role
        userName = userData?.name
    }

    // Buscar dados do usuário para validar macro_sector
    const { data: userDetails } = await supabase
        .from('users')
        .select('primary_group_id, groups!primary_group_id(macro_sector)')
        .eq('id', userId)
        .single()

    const isAdmin = userRole === 'admin' || userRole === 'manager'
    const isKitchen = (userDetails?.groups as any)?.macro_sector === 'Cozinha Central' || userName === 'Cozinha Central'

    if (!isAdmin && !isKitchen) {
        return { success: false, error: 'Acesso negado' }
    }

    // 2. Buscar IDs dos grupos da Cozinha Central para filtro robusto
    const { data: ckGroups } = await supabase
        .from('groups')
        .select('id')
        .eq('macro_sector', 'Cozinha Central')
    
    const ckGroupIds = ckGroups?.map(g => g.id) || []

    // 3. Buscar sessões
    try {
        let query = supabase
            .from('count_sessions')
            .select(`
                id,
                status,
                started_at,
                completed_at,
                validation_status,
                validated_at,
                validation_reason,
                groups(id, name, macro_sector),
                users!user_id(name)
            `)
            .in('group_id', ckGroupIds)
            .order('started_at', { ascending: false })

        if (filters.groupId) {
            query = query.eq('group_id', filters.groupId)
        }

        if (filters.date) {
            // Use local date range for filtering
            query = query.gte('started_at', `${filters.date}T00:00:00Z`)
            query = query.lte('started_at', `${filters.date}T23:59:59Z`)
        } else {
            const sevenDaysAgo = new Date()
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
            query = query.gte('started_at', sevenDaysAgo.toISOString())
        }

        const { data, error } = await query
        if (error) throw error

        return { success: true, data }
    } catch (e: any) {
        console.error('[getKitchenSessionHistoryAction] Erro:', e.message)
        return { success: false, error: e.message }
    }
}
