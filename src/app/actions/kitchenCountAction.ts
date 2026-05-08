'use server'

import { createClient } from '@supabase/supabase-js'
import { getActiveOperator } from '@/app/actions/pinAuth'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const KITCHEN_ROUTINE_NAME = 'Contagem Cozinha Central'
const KITCHEN_MACRO_SECTOR = 'Cozinha Central'

// ── Tipos Públicos ────────────────────────────────────────────

export interface KitchenCountGroup {
    groupId: string
    groupName: string
    itemCount: number
    countedCount: number
    pendingCount: number
    status: 'pending' | 'in_progress' | 'completed'
    sessionId: string | null
    updatedAt: string | null
}

export interface KitchenCountRoutine {
    routineId: string
    routineName: string
    groups: KitchenCountGroup[]
    totalItems: number
    totalCounted: number
    overallStatus: 'pending' | 'in_progress' | 'completed'
}

// ── Segurança: verifica se o caller é Cozinha Central ou admin/manager ──

async function assertKitchenAccess(): Promise<{ userId: string; allowed: boolean }> {
    const op = await getActiveOperator()

    if (op) {
        const isKitchen = op.name === 'Cozinha Central' || op.role === 'kitchen'
        const isManager = op.role === 'admin' || op.role === 'manager'
        return { userId: op.userId, allowed: isKitchen || isManager }
    }

    // Fallback: usuário autenticado diretamente (admin web)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { userId: '', allowed: false }

    const { data: userData } = await supabase
        .from('users')
        .select('role, name')
        .eq('id', user.id)
        .single()

    const isKitchen = userData?.name === 'Cozinha Central' || userData?.role === 'kitchen'
    const isManager = userData?.role === 'admin' || userData?.role === 'manager'

    return { userId: user.id, allowed: isKitchen || isManager }
}

// ── Action Principal: carrega rotina + status de sessões do dia ──

export async function getKitchenCountStatusAction(): Promise<{
    success: boolean
    data?: KitchenCountRoutine
    error?: string
}> {
    try {
        const { userId, allowed } = await assertKitchenAccess()
        if (!allowed) {
            return { success: false, error: 'Acesso não autorizado à contagem da Cozinha Central.' }
        }

        // 1. Busca a rotina da CK
        const { data: rotina } = await supabase
            .from('routines')
            .select('id, name')
            .eq('name', KITCHEN_ROUTINE_NAME)
            .eq('active', true)
            .single()

        if (!rotina) {
            return {
                success: false,
                error: 'Rotina "Contagem Cozinha Central" não encontrada. Execute a migration 20260508_kitchen_count_module.sql.'
            }
        }

        // 2. Grupos vinculados à rotina (somente CK)
        const { data: routineGroups } = await supabase
            .from('routine_groups')
            .select('group_id, groups(id, name, macro_sector)')
            .eq('routine_id', rotina.id)

        const ckGroups = (routineGroups || [])
            .map(rg => (rg.groups as unknown) as { id: string; name: string; macro_sector: string } | null)
            .filter((g): g is { id: string; name: string; macro_sector: string } =>
                g !== null && g.macro_sector === KITCHEN_MACRO_SECTOR
            )

        if (ckGroups.length === 0) {
            return { success: false, error: 'Nenhum grupo da Cozinha Central vinculado à rotina.' }
        }

        const groupIds = ckGroups.map(g => g.id)

        // 3. Itens ativos por grupo
        const { data: allItems } = await supabase
            .from('items')
            .select('id, group_id')
            .in('group_id', groupIds)
            .eq('active', true)

        const itemCountByGroup: Record<string, number> = {}
        allItems?.forEach(item => {
            itemCountByGroup[item.group_id] = (itemCountByGroup[item.group_id] || 0) + 1
        })

        // 4. Sessões de hoje para esses grupos
        const brDate = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(new Date())
        const startOfDayBR = `${brDate}T03:00:00Z`

        const { data: sessions } = await supabase
            .from('count_sessions')
            .select('id, group_id, status, updated_at')
            .eq('routine_id', rotina.id)
            .in('group_id', groupIds)
            .gte('started_at', startOfDayBR)
            .order('started_at', { ascending: false })

        // Pega a sessão mais recente por grupo
        const latestSessionByGroup: Record<string, typeof sessions extends (infer T)[] | null ? T : never> = {}
        sessions?.forEach(s => {
            if (!latestSessionByGroup[s.group_id]) {
                latestSessionByGroup[s.group_id] = s
            }
        })

        // 5. Para sessões in_progress, conta quantos itens já foram salvos
        const inProgressSessionIds = Object.values(latestSessionByGroup)
            .filter(s => s?.status === 'in_progress')
            .map(s => s!.id)

        const countedBySession: Record<string, number> = {}
        if (inProgressSessionIds.length > 0) {
            const { data: countedItems } = await supabase
                .from('count_session_items')
                .select('session_id, item_id, counted_quantity, is_zeroed')
                .in('session_id', inProgressSessionIds)

            countedItems?.forEach(ci => {
                if (ci.counted_quantity !== null || ci.is_zeroed) {
                    countedBySession[ci.session_id] = (countedBySession[ci.session_id] || 0) + 1
                }
            })
        }

        // 6. Monta o resultado por grupo
        const groups: KitchenCountGroup[] = ckGroups.map(g => {
            const session = latestSessionByGroup[g.id]
            const itemCount = itemCountByGroup[g.id] || 0
            const sessStatus = session?.status ?? null

            let countedCount = 0
            if (sessStatus === 'completed') {
                countedCount = itemCount
            } else if (sessStatus === 'in_progress' && session?.id) {
                countedCount = countedBySession[session.id] || 0
            }

            const status: KitchenCountGroup['status'] =
                sessStatus === 'completed' ? 'completed' :
                sessStatus === 'in_progress' ? 'in_progress' : 'pending'

            return {
                groupId: g.id,
                groupName: g.name,
                itemCount,
                countedCount,
                pendingCount: itemCount - countedCount,
                status,
                sessionId: session?.id ?? null,
                updatedAt: session?.updated_at ?? null,
            }
        })

        const totalItems = groups.reduce((s, g) => s + g.itemCount, 0)
        const totalCounted = groups.reduce((s, g) => s + g.countedCount, 0)
        const allDone = groups.every(g => g.status === 'completed')
        const anyInProgress = groups.some(g => g.status === 'in_progress')
        const overallStatus: KitchenCountRoutine['overallStatus'] =
            allDone ? 'completed' : anyInProgress ? 'in_progress' : 'pending'

        return {
            success: true,
            data: {
                routineId: rotina.id,
                routineName: rotina.name,
                groups,
                totalItems,
                totalCounted,
                overallStatus
            }
        }
    } catch (e: any) {
        console.error('[KitchenCountAction] Erro em getKitchenCountStatusAction:', e)
        return { success: false, error: e.message || 'Erro interno ao carregar contagem da CK.' }
    }
}
