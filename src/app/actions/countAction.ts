'use server'

import { createClient } from '@supabase/supabase-js'
import { getCycleAnchorDate } from '@/modules/count/helpers'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function initCountSessionAction(routineId: string, groupId: string, userId: string) {
    const { data: group } = await supabase.from('groups').select('name').eq('id', groupId).single()

    const { data: routineRow } = await supabase
        .from('routines')
        .select('snapshot_started_at')
        .eq('id', routineId)
        .single()

    const cycleStart = getCycleAnchorDate(routineRow?.snapshot_started_at)

    const { data: existingSession } = await supabase
        .from('count_sessions')
        .select('id, status, user_id, execution_id, users(name)')
        .eq('routine_id', routineId)
        .eq('group_id', groupId)
        .gte('started_at', cycleStart)
        .order('started_at', { ascending: false })
        .limit(1)
        .single()

    if (existingSession) {
        if (existingSession.status === 'completed') {
            return { blocked: 'Este grupo já foi concluído hoje e não pode mais ser editado.' }
        }
        if (existingSession.status === 'in_progress' && existingSession.user_id !== userId) {
            const uName = (existingSession.users as any)?.name || 'Outro usuário'
            return { blocked: `Este grupo está em andamento por ${uName}. Contagem paralela não é permitida.` }
        }
    }

    let sessionId = existingSession?.id

    // Puxa a execução ativa
    const { data: exec } = await supabase.from('routine_executions').select('id').eq('routine_id', routineId).eq('status', 'active').maybeSingle()

    if (!existingSession) {
        const { data: newSession } = await supabase.from('count_sessions').insert([{
            routine_id: routineId,
            group_id: groupId,
            user_id: userId,
            status: 'in_progress',
            started_at: new Date().toISOString(),
            execution_id: exec?.id || null
        }]).select('id').single()
        if (newSession) sessionId = newSession.id
    } else {
        // Se a sessão já existia (ex: operador abriu antes de o gerente iniciar ciclo),
        // amarra ela obrigatoriamente na execução oficial gerada agora
        if (exec?.id && existingSession.execution_id !== exec.id) {
            await supabase.from('count_sessions').update({ execution_id: exec.id }).eq('id', sessionId)
        }
    }

    const { data: items } = await supabase.from('items').select('id, name, unit, unit_observation, min_expected, max_expected, image_url').eq('group_id', groupId).eq('active', true).order('name', { ascending: true })

    const dbCounts: Record<string, string> = {}
    const dbZeroed: Record<string, boolean> = {}
    if (sessionId) {
        const { data: dbItems } = await supabase.from('count_session_items').select('item_id, counted_quantity, is_zeroed').eq('session_id', sessionId)
        if (dbItems) {
            dbItems.forEach(d => {
                if (d.counted_quantity !== null && d.counted_quantity !== undefined) {
                    dbCounts[d.item_id] = d.counted_quantity.toString()
                }
                if (d.is_zeroed) {
                    dbZeroed[d.item_id] = true
                }
            })
        }
    }

    return {
        sessionId,
        groupName: group?.name || '',
        items: items || [],
        dbCounts,
        dbZeroed
    }
}

export async function syncCountSessionAction(sessionId: string, currentCounts: Record<string, string>, complete: boolean = false, zeroedMap: Record<string, boolean> = {}) {
    const upserts = Object.keys(currentCounts).map(itemId => {
        const qty = currentCounts[itemId]
        return {
            session_id: sessionId,
            item_id: itemId,
            counted_quantity: qty === '' ? null : parseFloat(qty.replace(',', '.')),
            is_zeroed: !!zeroedMap[itemId]
        }
    })

    if (upserts.length > 0) {
        const { error: upsErr } = await supabase.from('count_session_items').upsert(upserts, { onConflict: 'session_id,item_id' })
        if (upsErr) return { error: `Upsert Error: ${upsErr.message}` }
    }

    const payload: any = { updated_at: new Date().toISOString() }
    if (complete) {
        payload.status = 'completed'
        payload.completed_at = new Date().toISOString()
    }

    const { error: updErr } = await supabase.from('count_sessions').update(payload).eq('id', sessionId)
    if (updErr) return { error: `Update Error: ${updErr.message}` }

    // --- GAMIFICAÇÃO (Camada Secundária e Resiliente) ---
    if (complete) {
        // Rodamos a gamificação de forma "fire and forget" controlada ou apenas com catch isolado
        // para garantir que falhas aqui NÃO afetem o retorno de sucesso da contagem.
        try {
            const { data: sess } = await supabase
                .from('count_sessions')
                .select('user_id, routine_id')
                .eq('id', sessionId)
                .single()

            if (sess?.user_id) {
                const { recordPointsAction, recordSealingEventAction, checkAndRewardRoutineCompletionAction } = await import('./gamificationAction')
                
                // 1. Pontua conclusão de grupo (+50)
                await recordPointsAction(
                    sess.user_id,
                    'count_group_completion',
                    sessionId,
                    50,
                    'Setor conferido com sucesso.'
                )

                // 2. VD-03: Sessão fechada sem abandono (sempre que chega ao complete)
                await recordSealingEventAction(sess.user_id, 'session_clean_close', sessionId)

                // 3. Verifica completude da rotina e pontua (+100) — retorna {duplicated: true} se já foi pontuado
                const routineReward = await checkAndRewardRoutineCompletionAction(sessionId)

                // 4. VD-04: Rotina sem ruptura — só dispara quando a rotina acabou de ser completada
                // Garante: não duplica (amarrado ao momento único de conclusão da rotina)
                if (routineReward.success && !routineReward.duplicated && sess.routine_id) {
                    const { data: completedSessionIds } = await supabase
                        .from('count_sessions')
                        .select('id')
                        .eq('routine_id', sess.routine_id)
                        .eq('status', 'completed')

                    const ids = completedSessionIds?.map(s => s.id) || []

                    if (ids.length > 0) {
                        const { data: zeroedInRoutine } = await supabase
                            .from('count_session_items')
                            .select('id')
                            .eq('is_zeroed', true)
                            .in('session_id', ids)
                            .limit(1)

                        if (!zeroedInRoutine || zeroedInRoutine.length === 0) {
                            await recordSealingEventAction(sess.user_id, 'routine_zero_rupture', sess.routine_id)
                        }
                    }
                }
            }
        } catch (gamErr) {
            // Logamos o erro mas não interrompemos o fluxo
            console.error('[Gamification] Falha silenciosa na integração:', gamErr)
        }
    }

    return { success: true }
}

export async function deleteCountSessionAction(sessionId: string): Promise<{ success: boolean; error?: string }> {
    const { data: sess } = await supabase
        .from('count_sessions')
        .select('status, user_id')
        .eq('id', sessionId)
        .single()
        
    if (!sess) return { success: false, error: 'Sessão não encontrada.' }
    if (sess.status === 'completed') return { success: false, error: 'Não é possível excluir uma contagem já finalizada.' }

    // Apaga os itens
    await supabase.from('count_session_items').delete().eq('session_id', sessionId)
    // Apaga a sessão
    const { error } = await supabase.from('count_sessions').delete().eq('id', sessionId)

    if (error) return { success: false, error: `Erro ao excluir: ${error.message}` }
    return { success: true }
}
