'use server'

import { createClient } from '@supabase/supabase-js'
import { getStartOfOperationalWeek } from '@/lib/dateUtils'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Tipos de evento de gamificação.
 * 
 * EXISTENTES (contagem):
 *   count_group_completion    — Setor de contagem concluído (+50 pts)
 *   count_routine_completion  — Rotina completa concluída (+100 pts)
 *
 * VEDAÇÃO — Fase 1:
 *   checklist_on_time         — VD-02: Checklist crítico concluído no prazo (+50 pts)
 *   session_clean_close       — VD-03: Sessão de contagem fechada sem abandono (+25 pts)
 *   routine_zero_rupture      — VD-04: Rotina concluída sem nenhum item zerado (+75 pts bônus)
 */
export type GamificationEventType =
    | 'count_group_completion'
    | 'count_routine_completion'
    | 'checklist_on_time'
    | 'session_clean_close'
    | 'routine_zero_rupture'

const SEALING_POINTS: Record<string, number> = {
    checklist_on_time:    50,
    session_clean_close:  25,
    routine_zero_rupture: 75,
}

/**
 * Registra um evento de pontuação de forma idempotente.
 */
export async function recordPointsAction(
    userId: string,
    type: GamificationEventType,
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
            if (error.code === '23505') {
                return { success: true, duplicated: true }
            }
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

/**
 * Registra um evento de VEDAÇÃO (comportamento que protege a operação).
 * Fire-and-forget seguro: erros aqui nunca interrompem o fluxo operacional.
 */
export async function recordSealingEventAction(
    userId: string,
    type: 'checklist_on_time' | 'session_clean_close' | 'routine_zero_rupture',
    sourceId: string
) {
    try {
        const points = SEALING_POINTS[type]
        const reasons: Record<string, string> = {
            checklist_on_time:    'Checklist concluído no prazo. A operação seguiu o padrão.',
            session_clean_close:  'Setor conferido sem abandono. Contagem limpa.',
            routine_zero_rupture: 'Rotina concluída sem ruptura. Estoque protegido.',
        }

        const { error } = await supabase
            .from('gamification_events')
            .insert([{
                user_id: userId,
                source_type: type,
                source_id: sourceId,
                points,
                reason: reasons[type]
            }])

        // Ignora duplicatas (idempotente)
        if (error && error.code !== '23505') {
            console.error(`[Sealing] Falha ao registrar evento ${type}:`, error.message)
        }

        return { success: true }
    } catch (err: any) {
        console.error('[Sealing] Erro inesperado:', err.message)
        return { success: false }
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
 */
export async function checkAndRewardRoutineCompletionAction(sessionId: string) {
    try {
        const { data: currentSession, error: sErr } = await supabase
            .from('count_sessions')
            .select('routine_id, user_id, started_at')
            .eq('id', sessionId)
            .single()

        if (sErr || !currentSession) return { success: false, error: 'Sessão não encontrada' }

        const { routine_id, user_id, started_at } = currentSession
        const dayAnchor = started_at ? started_at.split('T')[0] : new Date().toISOString().split('T')[0]
        const startTime = `${dayAnchor}T03:00:00Z` 

        const { data: routineGroups, error: rgErr } = await supabase
            .from('routine_groups')
            .select('group_id')
            .eq('routine_id', routine_id)

        if (rgErr || !routineGroups) return { success: false, error: 'Grupos da rotina não encontrados' }
        
        const totalGroupsCount = routineGroups.length
        if (totalGroupsCount === 0) return { success: true }

        const { data: completedSessions, error: csErr } = await supabase
            .from('count_sessions')
            .select('group_id')
            .eq('routine_id', routine_id)
            .eq('status', 'completed')
            .gte('started_at', startTime)

        if (csErr || !completedSessions) return { success: false, error: 'Erro ao validar sessões concluídas' }

        const completedGroupIds = new Set(completedSessions.map(s => s.group_id))

        if (completedGroupIds.size >= totalGroupsCount) {
            return await recordPointsAction(
                user_id,
                'count_routine_completion',
                routine_id, 
                100,
                'Parabéns! Você concluiu todos os setores desta rotina hoje.'
            )
        }

        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
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

        const { data: events, error: eErr } = await supabase
            .from('gamification_events')
            .select('user_id, points')
            .gte('created_at', startOfWeek)

        if (eErr) throw eErr

        const { data: users, error: uErr } = await supabase
            .from('users')
            .select('id, name')
            .eq('role', 'operator')

        if (uErr) throw uErr

        const userPointsMap: Record<string, number> = {}
        events.forEach(ev => {
            userPointsMap[ev.user_id] = (userPointsMap[ev.user_id] || 0) + ev.points
        })

        const ranking: RankingEntry[] = users.map(u => ({
            userId: u.id,
            name: u.name,
            points: userPointsMap[u.id] || 0
        }))

        ranking.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points
            return a.name.localeCompare(b.name)
        })

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

/**
 * Retorna o evento de vedação mais recente de um usuário.
 */
export async function getLastSealingAction(userId: string) {
    try {
        const { data, error } = await supabase
            .from('gamification_events')
            .select('source_type, reason, points, created_at')
            .eq('user_id', userId)
            .in('source_type', ['checklist_on_time', 'session_clean_close', 'routine_zero_rupture'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (error) throw error

        return { success: true, data }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}
