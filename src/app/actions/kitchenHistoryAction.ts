'use server'

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import { getServerAuthContext } from '@/lib/server-auth-context'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getKitchenSessionHistoryAction(filters: { date?: string, groupId?: string }) {
    if (!process.env.TEST_USER_ID) {
        await createServerClient()
    }

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
            .eq('status', 'completed')
            .not('completed_at', 'is', null)
            .order('completed_at', { ascending: false })

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

            query = query.gte('completed_at', `${filters.date}T00:00:00-03:00`)
            query = query.lte('completed_at', `${filters.date}T23:59:59-03:00`)
        }

        const { data, error } = await query
        if (error) throw error

        if (!data || data.length === 0) {
            return { success: true, data: [] }
        }

        const sessionIds = data.map(s => s.id)
        const { data: itemCounts } = await supabaseAdmin
            .from('count_session_items')
            .select('session_id')
            .in('session_id', sessionIds)

        const itemsPerSession = new Map<string, number>()
        itemCounts?.forEach(ic => {
            const count = itemsPerSession.get(ic.session_id) || 0
            itemsPerSession.set(ic.session_id, count + 1)
        })

        const filteredData = data.filter(s => {
            const count = itemsPerSession.get(s.id) || 0
            if (count === 0) return false

            const userName = (s.users as any)?.name || ''
            if (userName.toLowerCase().includes('teste') || userName.toLowerCase().includes('test')) return false

            return true
        })

        return { success: true, data: filteredData }
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

export async function getLatestKitchenRoundAction() {
    try {
        const user = await getServerAuthContext()
        const isKitchen = user.role === 'admin' || user.role === 'kitchen' || user.groups?.macro_sector === 'Cozinha Central'
        if (!isKitchen) return { success: false, error: 'Acesso negado' }

        // 1. Buscar as últimas sessões finalizadas da CK
        const { data: recentSessions } = await supabaseAdmin
            .from('count_sessions')
            .select(`
                id,
                completed_at,
                groups!inner(macro_sector),
                users:user_id(name)
            `)
            .eq('status', 'completed')
            .not('completed_at', 'is', null)
            .eq('groups.macro_sector', 'Cozinha Central')
            .order('completed_at', { ascending: false })
            .limit(10)

        if (!recentSessions || recentSessions.length === 0) {
            return { success: true, data: null }
        }

        // Encontrar a primeira sessão que tem itens salvos e não é de teste
        let lastSession = null
        for (const s of recentSessions) {
            const userName = (s.users as any)?.name || ''
            if (userName.toLowerCase().includes('teste') || userName.toLowerCase().includes('test')) continue

            // Verificar se tem itens no banco
            const { count } = await supabaseAdmin
                .from('count_session_items')
                .select('*', { count: 'exact', head: true })
                .eq('session_id', s.id)

            if (count && count > 0) {
                lastSession = s
                break
            }
        }

        if (!lastSession) {
            return { success: true, data: null }
        }

        // 2. Determinar a data operacional (America/Sao_Paulo)
        const completedAt = new Date(lastSession.completed_at)
        const dateStr = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(completedAt)

        // 3. Buscar todas as sessões da mesma rodada (mesmo dia operacional)
        // Usamos o mesmo range de 00h-23h59 no fuso -03:00 que o histórico usa
        const { data: roundSessions, error } = await supabaseAdmin
            .from('count_sessions')
            .select(`
                id,
                status,
                started_at,
                completed_at,
                validation_status,
                validated_at,
                groups(id, name, macro_sector),
                users:user_id(name)
            `)
            .eq('status', 'completed')
            .not('completed_at', 'is', null)
            .eq('groups.macro_sector', 'Cozinha Central')
            .gte('completed_at', `${dateStr}T00:00:00-03:00`)
            .lte('completed_at', `${dateStr}T23:59:59-03:00`)
            .order('completed_at', { ascending: false })

        if (error) throw error

        if (!roundSessions || roundSessions.length === 0) {
            return { 
                success: true, 
                data: {
                    date: dateStr,
                    sessions: []
                } 
            }
        }

        const sessionIds = roundSessions.map(s => s.id)
        const { data: itemCounts } = await supabaseAdmin
            .from('count_session_items')
            .select('session_id')
            .in('session_id', sessionIds)

        const itemsPerSession = new Map<string, number>()
        itemCounts?.forEach(ic => {
            const count = itemsPerSession.get(ic.session_id) || 0
            itemsPerSession.set(ic.session_id, count + 1)
        })

        const filteredSessions = roundSessions.filter(s => {
            const count = itemsPerSession.get(s.id) || 0
            if (count === 0) return false

            const userName = (s.users as any)?.name || ''
            if (userName.toLowerCase().includes('teste') || userName.toLowerCase().includes('test')) return false

            return true
        })

        return { 
            success: true, 
            data: {
                date: dateStr,
                sessions: filteredSessions
            } 
        }
    } catch (e: any) {
        console.error('[getLatestKitchenRoundAction] Erro:', e.message)
        return { success: false, error: e.message }
    }
}

