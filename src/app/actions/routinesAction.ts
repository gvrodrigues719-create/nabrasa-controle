'use server'

import { createClient } from '@supabase/supabase-js'
import { getActiveOperator } from './pinAuth'
import { mapRoutineGroupsToStatus } from '@/modules/count/mappers'
import { requireManagerOrAdmin } from '@/lib/auth-utils'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getActiveRoutinesAction() {
    const { data, error } = await supabase.from('routines').select('*').eq('active', true).order('created_at', { ascending: false })
    if (error) return { error: error.message }
    return { data }
}

export async function getRoutineDetailsAction(routineId: string) {
    // Calcula o "hoje" no fuso de Brasília (America/Sao_Paulo)
    const brDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    const startOfDayBR = `${brDate}T03:00:00Z` // meia-noite BRT = 03:00 UTC

    const { data: routine } = await supabase.from('routines').select('name, snapshot_started_at, routine_type').eq('id', routineId).single()
    if (!routine) return { error: 'Rotina não encontrada' }

    let isStartedToday = false
    if (routine.snapshot_started_at) {
        // Converte o snapshot_started_at para a data em Brasília e compara
        const snapBrDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(routine.snapshot_started_at))
        isStartedToday = snapBrDate === brDate
    }

    const { data: rGroups } = await supabase.from('routine_groups').select('groups(id, name)').eq('routine_id', routineId)
    const { data: sessions } = await supabase
        .from('count_sessions')
        .select('id, group_id, status, updated_at, users(name)')
        .eq('routine_id', routineId)
        .gte('started_at', startOfDayBR)

    const groupIds = rGroups?.map(rg => (rg.groups as any).id) || []

    // Fetch item counts per group
    const { data: itemCounts } = await supabase
        .from('items')
        .select('group_id')
        .in('group_id', groupIds)
        .eq('active', true)

    const itemCountMap: Record<string, number> = {}
    itemCounts?.forEach(i => {
        itemCountMap[i.group_id] = (itemCountMap[i.group_id] || 0) + 1
    })

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
