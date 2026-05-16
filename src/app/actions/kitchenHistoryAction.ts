'use server'

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import { getServerAuthContext } from '@/lib/server-auth-context'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getKitchenSessionHistoryAction(filters: { date?: string, groupId?: string }) {
    const supabase = await createServerClient()

    const user = await getServerAuthContext()
    const isAdmin = user.role === 'admin'
    const isKitchen = user.role === 'kitchen' || user.groups?.macro_sector === 'Cozinha Central'

    if (!isAdmin && !isKitchen) {
        return { success: false, error: 'Acesso negado' }
    }

    // 2. Buscar sessões
    try {
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
            // Ajuste de Timezone: America/Sao_Paulo (UTC-3)
            // O dia '2026-05-08' em SP começa em '2026-05-08 03:00:00Z' e termina em '2026-05-09 02:59:59Z'
            const startStr = `${filters.date}T03:00:00Z`
            
            const endDate = new Date(`${filters.date}T23:59:59Z`)
            endDate.setHours(endDate.getHours() + 3) // Avança 3 horas para cobrir o fim do dia em SP (que entra no dia seguinte UTC)
            const endStr = endDate.toISOString()

            // Para ser ainda mais seguro com o final do dia, vamos usar gte e lte com o range ajustado
            // Mas note que contagens feitas no início da madrugada (00h-03h UTC) pertencem ao dia anterior em SP.
            // Para simplificar e garantir que pegamos o que o usuário espera:
            query = query.gte('started_at', `${filters.date}T00:00:00-03:00`)
            query = query.lte('started_at', `${filters.date}T23:59:59-03:00`)
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
        const user = await getServerAuthContext()
        const isKitchen = user.role === 'admin' || user.role === 'kitchen' || user.groups?.macro_sector === 'Cozinha Central'
        if (!isKitchen) throw new Error('Acesso negado')

        // Validar que todas as sessões pertencem à Cozinha Central (Prevenção IDOR)
        const { data: validSessions } = await supabaseAdmin
            .from('count_sessions')
            .select('id, groups!inner(macro_sector)')
            .in('id', sessionIds)
            .eq('groups.macro_sector', 'Cozinha Central')

        const validIds = new Set(validSessions?.map(s => s.id) || [])
        const allValid = sessionIds.every(id => validIds.has(id))
        if (!allValid) throw new Error('Tentativa de acesso a sessões fora do escopo da Cozinha Central.')

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

        const typedItems = (items || []) as any[]

        // Agrupar por item_id
        const consolidated: Record<string, any> = {}
        
        typedItems.forEach(i => {
            const id = i.item_id
            const qty = i.validated_quantity ?? i.counted_quantity ?? 0
            
            if (!consolidated[id]) {
                consolidated[id] = {
                    id,
                    name: i.items?.name,
                    unit: i.items?.unit,
                    groupName: Array.isArray(i.items?.groups) ? i.items?.groups[0]?.name : i.items?.groups?.name,
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
