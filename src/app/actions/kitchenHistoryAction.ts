'use server'

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveOperator } from '@/app/actions/pinAuth'

// Cliente com privilégios para diagnóstico se necessário, mas vamos tentar o padrão primeiro com logs
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getKitchenSessionHistoryAction(filters: { date?: string, groupId?: string }) {
    const supabase = await createServerClient()

    // 1. Validar acesso
    const op = await getActiveOperator()
    let userId = op?.userId
    let userRole = op?.role
    let userName = op?.name

    if (!op) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Não autenticado' }
        const { data: userData } = await supabase.from('users').select('role, name').eq('id', user.id).single()
        userId = user.id
        userRole = userData?.role
        userName = userData?.name
    }

    const { data: userDetails } = await supabaseAdmin
        .from('users')
        .select('primary_group_id, groups!primary_group_id(macro_sector)')
        .eq('id', userId)
        .single()

    const isAdmin = userRole === 'admin' || userRole === 'manager'
    const isKitchen = (userDetails?.groups as any)?.macro_sector === 'Cozinha Central' || userName === 'Cozinha Central'

    if (!isAdmin && !isKitchen) {
        return { success: false, error: 'Acesso negado' }
    }

    // 2. Buscar sessões usando o Admin Client para ignorar RLS (apenas para este diagnóstico crítico)
    try {
        // Primeiro, pegar todos os grupos que começam com CK ou são da Cozinha Central
        const { data: ckGroups } = await supabaseAdmin
            .from('groups')
            .select('id')
            .or('macro_sector.eq.Cozinha Central,name.ilike.CK%')
        
        const ckGroupIds = ckGroups?.map(g => g.id) || []

        let query = supabaseAdmin
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
                users:user_id(name)
            `)
            .in('group_id', ckGroupIds)
            .order('started_at', { ascending: false })

        if (filters.groupId) {
            query = query.eq('group_id', filters.groupId)
        }

        if (filters.date) {
            // Filtro de data local (GMT-3)
            // Para garantir que pegamos tudo do dia, vamos ser um pouco mais flexíveis na query
            const startStr = `${filters.date}T00:00:00Z`
            const endStr = `${filters.date}T23:59:59Z`
            query = query.gte('started_at', startStr).lte('started_at', endStr)
        }

        const { data, error } = await query
        if (error) throw error

        return { success: true, data }
    } catch (e: any) {
        console.error('[getKitchenSessionHistoryAction] Erro:', e.message)
        return { success: false, error: e.message }
    }
}

export async function getConsolidatedKitchenDataAction(sessionIds: string[]) {
    try {
        const { data: items, error } = await supabaseAdmin
            .from('count_session_items')
            .select(`
                item_id,
                counted_quantity,
                validated_quantity,
                items(name, unit, group_id, groups(name))
            `)
            .in('session_id', sessionIds)

        if (error) throw error

        // Agrupar por item_id
        const consolidated: Record<string, any> = {}
        
        items.forEach(i => {
            const id = i.item_id
            const qty = i.validated_quantity ?? i.counted_quantity ?? 0
            
            if (!consolidated[id]) {
                consolidated[id] = {
                    id,
                    name: i.items?.name,
                    unit: i.items?.unit,
                    groupName: i.items?.groups?.name,
                    total: 0
                }
            }
            consolidated[id].total += qty
        })

        return { 
            success: true, 
            data: Object.values(consolidated).sort((a, b) => a.name.localeCompare(b.name)) 
        }
    } catch (e: any) {
        console.error('[getConsolidatedKitchenDataAction] Erro:', e.message)
        return { success: false, error: e.message }
    }
}
