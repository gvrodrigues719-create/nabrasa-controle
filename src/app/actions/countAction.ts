'use server'

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function initCountSessionAction(routineId: string, groupId: string, userId: string) {
    const { data: group } = await supabase.from('groups').select('name').eq('id', groupId).single()

    const today = new Date().toISOString().split('T')[0]
    const { data: existingSession } = await supabase
        .from('count_sessions')
        .select('id, status, user_id, execution_id, users(name)')
        .eq('routine_id', routineId)
        .eq('group_id', groupId)
        .gte('started_at', `${today}T00:00:00Z`)
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

    const { data: items } = await supabase.from('items').select('id, name, unit, unit_observation').eq('group_id', groupId).eq('active', true).order('name', { ascending: true })

    const dbCounts: Record<string, string> = {}
    if (sessionId) {
        const { data: dbItems } = await supabase.from('count_session_items').select('item_id, counted_quantity').eq('session_id', sessionId)
        if (dbItems) {
            dbItems.forEach(d => {
                if (d.counted_quantity !== null && d.counted_quantity !== undefined) {
                    dbCounts[d.item_id] = d.counted_quantity.toString()
                }
            })
        }
    }

    return {
        sessionId,
        groupName: group?.name || '',
        items: items || [],
        dbCounts
    }
}

export async function syncCountSessionAction(sessionId: string, currentCounts: Record<string, string>, complete: boolean = false) {
    const upserts = Object.keys(currentCounts).map(itemId => {
        const qty = currentCounts[itemId]
        return {
            session_id: sessionId,
            item_id: itemId,
            counted_quantity: qty === '' ? null : parseFloat(qty.replace(',', '.'))
        }
    })

    const { error: delErr } = await supabase.from('count_session_items').delete().eq('session_id', sessionId)
    if (delErr) return { error: `Delete Error: ${delErr.message}` }

    if (upserts.length > 0) {
        const { error: insErr } = await supabase.from('count_session_items').insert(upserts)
        if (insErr) return { error: `Insert Error: ${insErr.message}` }
    }

    const payload: any = { updated_at: new Date().toISOString() }
    if (complete) {
        payload.status = 'completed'
        payload.completed_at = new Date().toISOString()
    }

    const { error: updErr } = await supabase.from('count_sessions').update(payload).eq('id', sessionId)
    if (updErr) return { error: `Update Error: ${updErr.message}` }

    return { success: true }
}
