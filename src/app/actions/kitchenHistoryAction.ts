import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function getKitchenSessionHistoryAction(filters: { date?: string, groupId?: string }) {
    const supabase = await createClient()

    // 1. Validar se o usuário tem acesso à Cozinha Central
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autenticado' }

    const { data: userData } = await supabase
        .from('users')
        .select('role, primary_group_id, groups!primary_group_id(macro_sector)')
        .eq('id', user.id)
        .single()

    const isAdmin = userData?.role === 'admin' || userData?.role === 'manager'
    const isKitchen = (userData?.groups as any)?.macro_sector === 'Cozinha Central'

    if (!isAdmin && !isKitchen) {
        return { success: false, error: 'Acesso negado' }
    }

    // 2. Buscar sessões
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
                groups!inner(id, name, macro_sector),
                users!user_id(name)
            `)
            .eq('groups.macro_sector', 'Cozinha Central')
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
