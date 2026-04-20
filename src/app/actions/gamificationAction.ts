'use server'

import { createClient } from '@supabase/supabase-js'
import { getStartOfOperationalWeek } from '@/lib/dateUtils'
import { triggerMissionValidationAction } from './missionAction'

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
    | 'checklist_completion'

const SEALING_POINTS: Record<string, number> = {
    checklist_on_time:    50,
    session_clean_close:  25,
    routine_zero_rupture: 75,
}

// ═══ NOVO MODELO MENSAL (ETAPA 2 & 3) ═══

export type UserTrack = 'cozinha' | 'salao' | 'lideranca'

const TRACK_WEIGHTS: Record<UserTrack, Record<string, number>> = {
    cozinha: {
        count_group_completion: 50,
        count_routine_completion: 100,
        session_clean_close: 25,
        routine_zero_rupture: 50,
        checklist_on_time: 25,
        checklist_completion: 15,
        bonus_clean_shift: 20,
        bonus_loss_recorded: 10
    },
    salao: {
        checklist_completion: 20,
        count_group_completion: 15,
        bonus_clean_shift: 20,
        bonus_participation: 10
    },
    lideranca: {
        checklist_completion: 30, // Auditoria
        count_group_completion: 20,
        bonus_clean_shift: 30,
        bonus_validation: 20
    }
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
 * Na Fase 2, este disparo passa atuar pela engrenagem de Missões Operacionais (que cuida de Pts e Moedas).
 */
export async function recordSealingEventAction(
    userId: string,
    type: 'checklist_on_time' | 'session_clean_close' | 'routine_zero_rupture',
    sourceId: string
) {
    try {
        await triggerMissionValidationAction(userId, type, sourceId)
        return { success: true }
    } catch (err: any) {
        console.error('[Sealing->Mission] Erro inesperado:', err.message)
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
/**
 * Retorna os eventos recentes de gamificação de um usuário para compor o histórico.
 */
export async function getUserRecentActivitiesAction(userId: string, limit = 5) {
    try {
        const { data, error } = await supabase
            .from('gamification_events')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) throw error

        return { success: true, activities: data || [] }
    } catch (err: any) {
        return { success: false, error: err.message, activities: [] }
    }
}

// ═══ MOTOR MENSAL (ETAPAS 5 & 6) ═══

/**
 * Infere a trilha do usuário com base no papel e no grupo principal.
 */
export async function inferUserTrack(userId: string): Promise<UserTrack> {
    const { data: user } = await supabase
        .from('users')
        .select('role, primary_group_id, groups:primary_group_id(name)')
        .eq('id', userId)
        .single()

    if (!user) return 'salao'

    if (user.role === 'admin' || user.role === 'manager') return 'lideranca'
    
    const groupName = (user.groups as any)?.name || ''
    const kitchenKeywords = ['Cozinha', 'Estoque', 'Produção', 'Câmara', 'Grelha']
    
    if (kitchenKeywords.some(kw => groupName.includes(kw))) {
        return 'cozinha'
    }

    return 'salao'
}

/**
 * Calcula e persiste o score mensal de um usuário.
 */
export async function recalculateMonthlyScoreAction(userId: string, monthRef?: string) {
    try {
        const ref = monthRef || new Date().toISOString().slice(0, 7) // YYYY-MM
        const track = await inferUserTrack(userId)
        
        // 1. Ganhos do Mês
        const startOfMonth = `${ref}-01T03:00:00Z`
        const { data: events } = await supabase
            .from('gamification_events')
            .select('points, source_type')
            .eq('user_id', userId)
            .gte('created_at', startOfMonth)

        const pointsEarned = events?.reduce((acc, curr) => acc + curr.points, 0) || 0

        // 2. Disponíveis do Mês (Estimativa teórica v1)
        // Por enquanto, baseamos na agenda teórica: 2 checklists/dia e 1 contagem/dia como base.
        // Em uma v2, isto leria a tabela 'routine_groups' para ser 100% preciso.
        const daysInMonth = 30 
        const dailyAvailable = (TRACK_WEIGHTS[track].checklist_completion || 20) * 1 + (TRACK_WEIGHTS[track].count_group_completion || 50) * 1
        const pointsAvailable = dailyAvailable * daysInMonth

        const scorePercentage = Math.min((pointsEarned / (pointsAvailable || 1)) * 100, 100)

        // 3. Persistência
        const { error } = await supabase
            .from('monthly_user_scores')
            .upsert({
                user_id: userId,
                month_ref: ref,
                track_type: track,
                points_earned: pointsEarned,
                points_available: pointsAvailable,
                score_percentage: scorePercentage,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, month_ref' })

        if (error) throw error

        return { success: true, scorePercentage, pointsEarned, pointsAvailable }
    } catch (err: any) {
        console.error('[MonthlyScore] Erro:', err.message)
        return { success: false, error: err.message }
    }
}

/**
 * Retorna o resumo operacional mensal do operador.
 */
export async function getMonthlyOperatorSummaryAction(userId: string) {
    try {
        const ref = new Date().toISOString().slice(0, 7)
        
        // Garante que o score está atualizado antes de ler
        await recalculateMonthlyScoreAction(userId, ref)

        const { data: scoreData } = await supabase
            .from('monthly_user_scores')
            .select('*')
            .eq('user_id', userId)
            .eq('month_ref', ref)
            .single()

        // Ranking Mensal (Top 5)
        const rankingRes = await getMonthlyRankingAction(userId)

        return {
            success: true,
            monthRef: ref,
            score: scoreData?.score_percentage || 0,
            pointsEarned: scoreData?.points_earned || 0,
            pointsAvailable: scoreData?.points_available || 0,
            rankPosition: rankingRes.userPosition,
            top5: rankingRes.top5,
            track: scoreData?.track_type || 'operacional'
        }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

/**
 * Retorna o Ranking Mensal baseado em Score (%)
 */
export async function getMonthlyRankingAction(userId?: string) {
    try {
        const ref = new Date().toISOString().slice(0, 7)

        const { data: scores, error } = await supabase
            .from('monthly_user_scores')
            .select('user_id, score_percentage, points_earned, users(name)')
            .eq('month_ref', ref)
            .order('score_percentage', { ascending: false })

        if (error) throw error

        const ranking = scores.map((s, idx) => ({
            userId: s.user_id,
            name: (s.users as any)?.name || 'Operador',
            score: s.score_percentage,
            points: s.points_earned,
            rank: idx + 1
        }))

        const userPosition = userId ? ranking.findIndex(r => r.userId === userId) + 1 : null
        const top5 = ranking.slice(0, 5)

        return {
            success: true,
            top5,
            userPosition
        }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}
