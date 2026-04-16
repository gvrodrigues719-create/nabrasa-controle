'use server'

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Registra um evento de pontuação de forma idempotente.
 * Se o par (user_id, source_type, source_id) já existir, não faz nada.
 */
export async function recordPointsAction(
    userId: string,
    type: 'count_group_completion' | 'count_routine_completion',
    sourceId: string,
    points: number,
    reason: string
) {
    try {
        const { error } = await supabase
            .from('gamification_events')
            .insert([{
                user_id: userId,
                source_type: type,
                source_id: sourceId,
                points: points,
                reason: reason
            }])

        if (error) {
            // Se o erro for de violação de UNIQUE (23505 no Postgres), tratamos de forma silenciosa
            if (error.code === '23505') {
                console.log(`[Gamification] Evento duplicado ignorado: ${type} para source ${sourceId}`)
                return { success: true, duplicated: true }
            }
            console.error('[Gamification] Erro ao registrar pontos:', error.message)
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (err: any) {
        console.error('[Gamification] Exceção ao registrar pontos:', err.message)
        return { success: false, error: err.message }
    }
}

/**
 * Retorna o total de pontos acumulados de um usuário.
 */
export async function getUserTotalPointsAction(userId: string) {
    try {
        const { data, error } = await supabase
            .from('gamification_events')
            .select('points')
            .eq('user_id', userId)

        if (error) throw error

        const total = data.reduce((acc, curr) => acc + curr.points, 0)
        return { success: true, total }
    } catch (err: any) {
        return { success: false, error: err.message, total: 0 }
    }
}

/**
 * Verifica se todos os grupos de uma rotina foram concluídos hoje.
 * Se sim, atribui o bônus de rotina completa.
 * Deve ser chamado APÓS a conclusão de um grupo.
 */
export async function checkAndRewardRoutineCompletionAction(sessionId: string) {
    try {
        // 1. Busca dados da sessão atual
        const { data: currentSession, error: sErr } = await supabase
            .from('count_sessions')
            .select('routine_id, user_id, started_at')
            .eq('id', sessionId)
            .single()

        if (sErr || !currentSession) return { success: false, error: 'Sessão não encontrada' }

        const { routine_id, user_id, started_at } = currentSession

        // Usa a data de início da sessão como âncora para o dia (ou 03:00 UTC se não houver)
        const dayAnchor = started_at ? started_at.split('T')[0] : new Date().toISOString().split('T')[0]
        const startTime = `${dayAnchor}T03:00:00Z` // Meia-noite BRT

        // 2. Busca todos os grupos que pertencem a esta rotina
        const { data: routineGroups, error: rgErr } = await supabase
            .from('routine_groups')
            .select('group_id')
            .eq('routine_id', routine_id)

        if (rgErr || !routineGroups) return { success: false, error: 'Grupos da rotina não encontrados' }
        
        const totalGroupsCount = routineGroups.length
        if (totalGroupsCount === 0) return { success: true }

        const groupIds = routineGroups.map(rg => rg.group_id)

        // 3. Busca sessões concluídas hoje para esses grupos
        const { data: completedSessions, error: csErr } = await supabase
            .from('count_sessions')
            .select('group_id')
            .eq('routine_id', routine_id)
            .eq('status', 'completed')
            .gte('started_at', startTime)

        if (csErr || !completedSessions) return { success: false, error: 'Erro ao validar sessões concluídas' }

        // Mapeia grupos únicos concluídos
        const completedGroupIds = new Set(completedSessions.map(s => s.group_id))

        // 4. Se a quantidade de grupos únicos concluídos for igual ao total da rotina, pontua!
        if (completedGroupIds.size >= totalGroupsCount) {
            // O source_id para rotina completa será uma combinação determinística: routine_id:dayAnchor
            // para que a UNIQUE constraint do banco impeça bônus duplo no mesmo dia
            const routineDayId = `${routine_id}:${dayAnchor}`
            
            // Como source_id precisa ser UUID, e não queremos criar tabela de 'routine_completions' agora,
            // vamos usar o ID da própria rotina como source_id, mas a UNIQUE composta será:
            // (user_id, 'count_routine_completion', routine_id) 
            // NOTA: Se o usuário fizer a mesma rotina duas vezes no mesmo dia (raro), o UNIQUE impedirá o bônus duplo.
            
            return await recordPointsAction(
                user_id,
                'count_routine_completion',
                routine_id, // Usamos o ID da rotina como gatilho
                100,
                'Parabéns! Você concluiu todos os setores desta rotina hoje.'
            )
        }

        return { success: true, message: 'Rotina ainda incompleta' }
    } catch (err: any) {
        console.error('[Gamification] Erro na verificação de rotina:', err.message)
        return { success: false, error: err.message }
    }
}

/**
 * Retorna o início da semana operacional (Segunda-feira 03:00 UTC / 00:00 BRT)
 */
function getStartOfOperationalWeek(): string {
    const now = new Date()
    // h = 3 (03:00 UTC)
    const day = now.getUTCDay() // 0 (Sun), 1 (Mon), ..., 6 (Sat)
    const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1) // ajusta para Segunda
    
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff, 3, 0, 0, 0))
    
    // Se hoje for segunda antes das 03:00 UTC, a semana operacional começou na segunda anterior
    if (now < start) {
        start.setUTCDate(start.getUTCDate() - 7)
    }
    
    return start.toISOString()
}

export type RankingEntry = {
    userId: string
    name: string
    points: number
}

/**
 * Retorna o Ranking Semanal (Top 5) e a posição do usuário logado.
 */
export async function getWeeklyRankingAction(userId: string) {
    try {
        const startOfWeek = getStartOfOperationalWeek()

        // 1. Busca todos os eventos da semana
        const { data: events, error: eErr } = await supabase
            .from('gamification_events')
            .select('user_id, points')
            .gte('created_at', startOfWeek)

        if (eErr) throw eErr

        // 2. Busca todos os usuários para ter os nomes
        const { data: users, error: uErr } = await supabase
            .from('users')
            .select('id, name')

        if (uErr) throw uErr

        // 3. Agrupa pontos por usuário
        const userPointsMap: Record<string, number> = {}
        events.forEach(ev => {
            userPointsMap[ev.user_id] = (userPointsMap[ev.user_id] || 0) + ev.points
        })

        // 4. Cria a lista ordenada
        const ranking: RankingEntry[] = users.map(u => ({
            userId: u.id,
            name: u.name,
            points: userPointsMap[u.id] || 0
        }))

        // Ordena por pontos desc, e nome como desempate
        ranking.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points
            return a.name.localeCompare(b.name)
        })

        // 5. Encontra a posição do usuário e o Top 5
        const userPosition = ranking.findIndex(r => r.userId === userId) + 1
        const top5 = ranking.slice(0, 5)

        return {
            success: true,
            top5,
            userPosition,
            userPointsWeekly: userPointsMap[userId] || 0,
            startOfWeek
        }
    } catch (err: any) {
        console.error('[Gamification] Erro ao obter ranking:', err.message)
        return { success: false, error: err.message }
    }
}

/**
 * Retorna um resumo completo dos pontos e ranking para o operador.
 */
export async function getOperatorSummaryAction(userId: string) {
    try {
        const rankingRes = await getWeeklyRankingAction(userId)
        const totalPointsRes = await getUserTotalPointsAction(userId)

        if (!rankingRes.success || !totalPointsRes.success) {
            throw new Error(rankingRes.error || totalPointsRes.error)
        }

        return {
            success: true,
            totalPoints: totalPointsRes.total,
            weeklyPoints: rankingRes.userPointsWeekly,
            rankPosition: rankingRes.userPosition,
            top5: rankingRes.top5
        }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}
