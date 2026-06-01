'use server'

import { createClient } from '@supabase/supabase-js'
import { getActiveOperator } from './pinAuth'
import { mapRoutineGroupsToStatus } from '@/modules/count/mappers'
import { requireManagerOrAdmin } from '@/lib/auth-utils'
import { getAccessibleCountScope } from '@/lib/server-auth-context'
import { getUnitFeatureFlags } from '@/lib/feature-flags'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getActiveRoutinesAction() {
    const scope = await getAccessibleCountScope()
    
    let query = supabase.from('routines').select('*').eq('active', true)

    // Se for loja, filtrar para mostrar APENAS as rotinas da sua própria loja
    
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) return { error: error.message }

    let filtered = data
    if (scope.type === 'store') {
        // Remove rotinas da Cozinha Central E filtra rotinas que pertencem a outra loja
        const { data: ckRoutines } = await supabase
            .from('routine_groups')
            .select('routine_id, groups!inner(macro_sector)')
            .eq('groups.macro_sector', 'Cozinha Central')
        
        const ckRoutineIds = new Set(ckRoutines?.map(r => r.routine_id) || [])
        
        filtered = data.filter(r => {
            // Se for da CK, remove
            if (ckRoutineIds.has(r.id)) return false
            // Se tiver unit_id e não for o unit_id da loja do operador, remove
            if (r.unit_id && r.unit_id !== scope.unitId) return false
            return true
        })
    } else if (scope.type === 'kitchen') {
        const { data: ckRoutines } = await supabase
            .from('routine_groups')
            .select('routine_id, groups!inner(macro_sector)')
            .eq('groups.macro_sector', 'Cozinha Central')
        
        const ckRoutineIds = new Set(ckRoutines?.map(r => r.routine_id) || [])
        filtered = data.filter(r => ckRoutineIds.has(r.id))
    }

    return { data: filtered }
}

export async function getRoutineDetailsAction(routineId: string) {
    // Calcula o "hoje" no fuso de Brasília (America/Sao_Paulo)
    const brDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    const startOfDayBR = `${brDate}T03:00:00Z` // meia-noite BRT = 03:00 UTC

    const scope = await getAccessibleCountScope()
    const { data: routine } = await supabase.from('routines').select('name, snapshot_started_at, routine_type, unit_id').eq('id', routineId).single()
    if (!routine) return { error: 'Rotina não encontrada' }

    let isStartedToday = false
    if (routine.snapshot_started_at) {
        // Converte o snapshot_started_at para a data em Brasília e compara
        const snapBrDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(routine.snapshot_started_at))
        isStartedToday = snapBrDate === brDate
    }

    const { data: rGroups } = await supabase.from('routine_groups').select('groups(id, name, macro_sector, unit_id)').eq('routine_id', routineId)

    // ── APLICAR ESCOPO DE SEGURANÇA ──────────────────────────────────────────
    const hasKitchen = rGroups?.some(rg => (rg.groups as any)?.macro_sector === 'Cozinha Central')
    if (scope.type === 'store') {
        if (hasKitchen) return { error: 'Acesso negado: Esta rotina pertence à Cozinha Central.' }
        if (routine.unit_id && routine.unit_id !== scope.unitId) return { error: 'Acesso negado: Esta rotina pertence a outra unidade.' }
    }
    if (scope.type === 'kitchen' && !hasKitchen) return { error: 'Acesso negado: Esta rotina não pertence à Cozinha Central.' }
    
    // Escolhe a tabela de sessões baseada no tipo de rotina
    const sessionTable = routine.routine_type === 'checklist' ? 'checklist_sessions' : 'count_sessions'
    
    const { data: sessions } = await supabase
        .from(sessionTable)
        .select('id, group_id, status, updated_at, users(name)')
        .eq('routine_id', routineId)
        .gte('started_at', startOfDayBR)

    const groupIds = rGroups?.map(rg => (rg.groups as any).id) || []

    // Fetch item counts per group (Se for checklist, o total é o número de itens no template)
    let itemCountMap: Record<string, number> = {}
    
    if (routine.routine_type === 'checklist') {
        const { data: template } = await supabase
            .from('routines')
            .select('checklist_template_id')
            .eq('id', routineId)
            .single()
        
        if (template?.checklist_template_id) {
            const { count } = await supabase
                .from('checklist_template_items')
                .select('*', { count: 'exact', head: true })
                .eq('template_id', template.checklist_template_id)
            
            groupIds.forEach(gid => {
                itemCountMap[gid] = count || 0
            })
        }
    } else {
        const { data: itemCounts } = await supabase
            .from('items')
            .select('group_id')
            .in('group_id', groupIds)
            .eq('active', true)

        itemCounts?.forEach(i => {
            itemCountMap[i.group_id] = (itemCountMap[i.group_id] || 0) + 1
        })
    }

    const mappedGroups = mapRoutineGroupsToStatus(rGroups || [], sessions || [], itemCountMap)

    return {
        data: {
            name: routine.name,
            hasSnapshot: isStartedToday,
            groups: mappedGroups
        }
    }
}

export async function verifyAndStartRoutineAction(routineId: string, pin: string) {
    try {
        // SEGURANÇA: Exige permissão adm/gestor para iniciar snapshot oficial
        const authId = await requireManagerOrAdmin()

        // Valida PIN (Segunda camada de proteção para ação crítica)
        const { data: isValid } = await supabase.rpc('verify_user_pin', { p_user_id: authId, p_pin: pin })
        if (!isValid) return { error: `PIN Incorreto ou não cadastrado.` }

        // Efetiva inicio da rotina (usando a master key que já temos instanciada aqui)
        const { data: executionId, error } = await supabase.rpc('start_routine_snapshot', { p_routine_id: routineId })
        if (error) return { error: error.message || 'Erro ao congelar estoque teórico.' }

        return { success: true, executionId }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function getOperatorDailyTasksAction(userId: string) {
    try {
        // 1. Data de referência (Brasília)
        const brDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
        const startOfDayBR = `${brDate}T03:00:00Z`

        // 2. Buscar setor do usuário
        const userData = await supabase.from('users').select('name, role, primary_group_id').eq('id', userId).maybeSingle().then(res => res.data)
        const primaryGroupId = userData?.primary_group_id
        const userRole = userData?.role
        const isTester = await isTestOperator(userData)

        const scope = await getAccessibleCountScope()

        const [routinesRes, groupsRes, itemsRes] = await Promise.all([
            supabase.from('routines').select('*').eq('active', true),
            supabase.from('routine_groups').select('routine_id, group_id, groups!group_id(name, macro_sector, unit_id)'),
            supabase.from('items').select('group_id').eq('active', true)
        ])

        if (routinesRes.error) throw routinesRes.error

        // 4. Buscar sessões de hoje
        const [countSessionsRes, checklistSessionsRes] = await Promise.all([
            supabase.from('count_sessions').select('routine_id, group_id, status, started_at').gte('started_at', startOfDayBR),
            supabase.from('checklist_sessions').select('routine_id, group_id, status, started_at').gte('started_at', startOfDayBR)
        ])

        const sessionMap = new Map()
        countSessionsRes.data?.forEach(s => sessionMap.set(`${s.routine_id}-${s.group_id}`, s))
        checklistSessionsRes.data?.forEach(s => {
            const key = `${s.routine_id}-${s.group_id}`
            if (!sessionMap.has(key) || s.status === 'in_progress') sessionMap.set(key, s)
        })

        // 5. Buscar Tarefas Operacionais (Produção, etc.)
        const { data: opTasks } = await supabase
            .from('operational_tasks')
            .select('*')
            .in('status', ['pending', 'in_progress'])
            .or(`responsible_id.eq.${userId},responsible_id.is.null`)

        const todayTasks: any[] = []
        const inProgressTasks: any[] = []
        const otherTasks: any[] = []

        routinesRes.data?.forEach(routine => {
            const routineGroups = groupsRes.data?.filter(g => g.routine_id === routine.id) || []
            
            routineGroups.forEach(rg => {
                const session = sessionMap.get(`${routine.id}-${rg.group_id}`)
                const isCompleted = session?.status === 'completed'
                const isInProgress = session?.status === 'in_progress'
                const flags = getUnitFeatureFlags(scope.unitId)
                const isMyArea = (rg.group_id === primaryGroupId) || (flags.isContagemOnly && userRole === 'operator')
                // ── RESOLVER METADADOS DO GRUPO ──────────────────────────────
                const groupData = rg.groups as any
                const groupName = groupData?.name || 'Setor'
                const macroSector = groupData?.macro_sector || ''
                const type = routine.routine_type === 'checklist' ? 'checklist' : 'count'

                // ── APLICAR ESCOPO DE SEGURANÇA ────────────────────────────────
                // Regra de Ouro: Bloqueio Total entre Macro Setores (Cozinha vs Lojas)
                if (scope.type === 'kitchen' && macroSector !== 'Cozinha Central') return
                if (scope.type === 'store' && macroSector === 'Cozinha Central') return
                
                // Isolamento entre lojas (Camboinhas vs Icaraí)
                // Usando a nova coluna unit_id na rotina (se preenchida) ou no grupo (se preenchida)
                // Para garantir retrocompatibilidade enquanto não houver backfill 100%, 
                // assumimos que se a rotina ou grupo TEM unit_id, DEVE bater com o do user.
                if (scope.type === 'store' && scope.unitId) {
                    if (routine.unit_id && routine.unit_id !== scope.unitId) return
                    if (groupData?.unit_id && groupData.unit_id !== scope.unitId) return
                }

                // REGRA: Se for contagem, só exibe se houver itens ativos no grupo
                if (type === 'count') {
                    const activeItemCount = itemsRes.data?.filter(i => i.group_id === rg.group_id).length || 0
                    if (activeItemCount === 0) return
                }

                const task = {
                    id: `${routine.id}-${rg.group_id}`,
                    routineId: routine.id,
                    groupId: rg.group_id,
                    name: type === 'count' ? `Contagem — ${groupName}` : routine.name,
                    groupName: groupName,
                    type,
                    frequency: routine.frequency,
                    status: isInProgress ? 'in_progress' : (isCompleted ? 'completed' : 'pending'),
                    isMyArea,
                    url: `/dashboard/${type}/${routine.id}/${rg.group_id}?returnTo=/dashboard/routines`,
                    startedAt: session?.started_at
                }

                if (isInProgress) {
                    inProgressTasks.push(task)
                } else if (isMyArea && !isCompleted) {
                    todayTasks.push(task)
                } else if (!isCompleted && (isTester || userRole === 'admin' || userRole === 'manager')) {
                    // Para o Operador Teste, Gestores, as outras rotinas da unidade devem ser visíveis
                    // Operadores comuns veem apenas a sua área principal (isMyArea).
                    otherTasks.push(task)
                }
            })
        })

        // Adicionar tarefas operacionais à lista
        opTasks?.forEach(task => {
            // ── APLICAR ESCOPO DE SEGURANÇA PARA TAREFAS ─────────────────────
            if (scope.type === 'store' && task.type === 'production') return
            if (scope.type === 'kitchen' && task.type !== 'production') return

            const isMyTask = task.responsible_id === userId
            const formattedTask = {
                id: task.id,
                name: task.title,
                description: task.description,
                type: 'other',
                status: task.status,
                isMyArea: isMyTask,
                url: task.type === 'production' 
                    ? `/dashboard/kitchen/order/${task.production_order_id}` 
                    : `/dashboard/tasks/${task.id}`,
                startedAt: task.created_at
            }

            if (task.status === 'in_progress') {
                inProgressTasks.push(formattedTask)
            } else if (isMyTask) {
                todayTasks.push(formattedTask)
            } else if (isTester || userRole === 'admin' || userRole === 'manager') {
                otherTasks.push(formattedTask)
            }
        })

        return {
            success: true,
            data: {
                today: todayTasks,
                inProgress: inProgressTasks,
                others: otherTasks,
                isTester
            },
            counts: {
                todayCount: todayTasks.length,
                pendingCounts: todayTasks.filter(t => t.type === 'count').length,
                pendingChecklists: todayTasks.filter(t => t.type === 'checklist').length
            }
        }

    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function isTestOperator(user: any) {
    return user?.name?.toLowerCase().includes('operador teste')
}
