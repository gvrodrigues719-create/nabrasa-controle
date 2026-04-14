'use server'

import { createClient } from '@supabase/supabase-js'
import { getActiveOperator } from './pinAuth'

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
    const today = new Date().toISOString().split('T')[0]

    const { data: routine } = await supabase.from('routines').select('name, snapshot_started_at').eq('id', routineId).single()
    if (!routine) return { error: 'Rotina não encontrada' }

    let isStartedToday = false
    if (routine.snapshot_started_at) {
        const snapDate = new Date(routine.snapshot_started_at).toISOString().split('T')[0]
        isStartedToday = snapDate === today
    }

    const { data: rGroups } = await supabase.from('routine_groups').select('groups(id, name)').eq('routine_id', routineId)
    const { data: sessions } = await supabase
        .from('count_sessions')
        .select('id, group_id, status, updated_at, users(name)')
        .eq('routine_id', routineId)
        .gte('started_at', `${today}T00:00:00Z`)

    const mappedGroups = rGroups?.map(rg => {
        const group: any = rg.groups
        const sessionForGroup = sessions?.find(s => s.group_id === group.id)
        return {
            id: group.id,
            name: group.name,
            session_id: sessionForGroup?.id || null,
            status: sessionForGroup?.status || 'available',
            user_name: (sessionForGroup?.users as any)?.name || null,
            updated_at: sessionForGroup?.updated_at || null
        }
    }) || []

    return {
        data: {
            name: routine.name,
            hasSnapshot: isStartedToday,
            groups: mappedGroups
        }
    }
}

export async function verifyAndStartRoutineAction(routineId: string, pin: string, clientManagerId?: string) {
    let userId = clientManagerId;
    if (!userId) {
        const op = await getActiveOperator()
        userId = op?.userId
    }

    if (!userId) {
        return { error: "Usuário não autenticado." }
    }

    // Valida PIN
    const { data: isValid } = await supabase.rpc('verify_user_pin', { p_user_id: userId, p_pin: pin })
    if (!isValid) return { error: "PIN Incorreto ou não cadastrado." }

    // Efetiva inicio da rotina (usando a master key que já temos instanciada aqui)
    const { data: executionId, error } = await supabase.rpc('start_routine_snapshot', { p_routine_id: routineId })
    if (error) return { error: error.message || 'Erro ao congelar estoque teórico.' }

    return { success: true, executionId }
}

