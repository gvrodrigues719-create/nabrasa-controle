'use server'

import { createClient } from '@supabase/supabase-js'
import { getStartOfOperationalWeek } from '@/lib/dateUtils'
import { triggerMissionValidationAction } from './missionAction'
import { requireManagerOrAdmin } from '@/lib/auth-utils'

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
        const top3 = ranking.slice(0, 3) // POLÍTICA: Operador vê apenas Top 3 positivo

        return {
            success: true,
            top3,
            userPosition,
            userPointsWeekly: userPointsMap[userId] || 0,
            startOfWeek
        }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

/**
 * Retorna o Ranking Completo (Gerencial) da unidade.
 * Restrito à camada gerente/admin (validado no servidor).
 */
export async function getManagerRankingSummaryAction() {
    try {
        await requireManagerOrAdmin()
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

        const ranking = users.map(u => ({
            userId: u.id,
            name: u.name,
            points: userPointsMap[u.id] || 0
        }))

        ranking.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points
            return a.name.localeCompare(b.name)
        })

        return {
            success: true,
            ranking, // Lista completa
            count: ranking.length,
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
            top3: rankingRes.top3 // POLÍTICA: Apenas Top 3 para operadores
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

// ═══ MOTOR MENSAL V2 (OFERECIMENTOS REAIS) ═══

/**
 * Calcula o potencial de pontos diários de um usuário baseado nas rotinas atribuídas.
 */
async function calculateUserPotential(userId: string, track: UserTrack) {
    const { data: user } = await supabase.from('users').select('primary_group_id').eq('id', userId).single()
    if (!user?.primary_group_id) return 0

    const { data: routines } = await supabase
        .from('routine_groups')
        .select(`
            routine_id,
            routines:routine_id (
                id,
                routine_type,
                checklist_template_id
            )
        `)
        .eq('group_id', user.primary_group_id)

    if (!routines || routines.length === 0) return 0

    let dailyPotential = 0

    routines.forEach((rg: any) => {
        const r = rg.routines
        if (!r) return

        const type = r.routine_type === 'checklist' ? 'checklist_completion' : 'count_group_completion'
        const weight = TRACK_WEIGHTS[track][type] || 0
        
        // Assume 1 vez ao dia por padrão (v2 simplificada)
        dailyPotential += weight
    })

    return dailyPotential
}

/**
 * Calcula a consistência do mês (dias ativos / dias passados).
 */
async function calculateConsistency(userId: string, startOfMonth: string) {
    const dayOfMonth = new Date().getDate()
    
    // Busca dias distintos que tiveram eventos
    const { data: events } = await supabase
        .from('gamification_events')
        .select('created_at')
        .eq('user_id', userId)
        .gte('created_at', startOfMonth)

    if (!events || events.length === 0) return 0

    const distinctDays = new Set(events.map(e => new Date(e.created_at).toISOString().split('T')[0]))
    return Math.min((distinctDays.size / dayOfMonth) * 100, 100)
}

/**
 * Calcula a participação do mês (tarefas feitas / total esperado).
 */
async function calculateParticipation(userId: string, startOfMonth: string, totalOpportunities: number) {
    if (totalOpportunities <= 0) return 100

    const { data: events } = await supabase
        .from('gamification_events')
        .select('id')
        .eq('user_id', userId)
        .in('source_type', ['count_group_completion', 'checklist_completion'])
        .gte('created_at', startOfMonth)

    const completedTasks = events?.length || 0
    return Math.min((completedTasks / totalOpportunities) * 100, 100)
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
 * Calcula e persiste o score mensal de um usuário (V2 - Lógica Real).
 */
export async function recalculateMonthlyScoreAction(userId: string, monthRef?: string) {
    try {
        const ref = monthRef || new Date().toISOString().slice(0, 7)
        const track = await inferUserTrack(userId)
        const startOfMonth = `${ref}-01T03:00:00Z`
        const dayOfMonth = new Date().getDate()

        // 1. Ganhos do Mês (Real)
        const { data: events } = await supabase
            .from('gamification_events')
            .select('points')
            .eq('user_id', userId)
            .gte('created_at', startOfMonth)

        const pointsEarned = events?.reduce((acc, curr) => acc + curr.points, 0) || 0

        // 2. Disponíveis do Mês (V2 - Baseado em Potencial da Trilha e Agendamento)
        const dailyPotential = await calculateUserPotential(userId, track)
        const pointsAvailable = dailyPotential * dayOfMonth
        const totalOpportunities = (dailyPotential > 0) ? (pointsAvailable / dailyPotential) : 0 // v2 simplificada de contagem total

        // 3. Métricas de Qualidade
        const scorePercentage = pointsAvailable > 0 ? Math.min((pointsEarned / pointsAvailable) * 100, 110) : 100 // Bônus permitido até 110
        const consistencyScore = await calculateConsistency(userId, startOfMonth)
        const participationScore = await calculateParticipation(userId, startOfMonth, totalOpportunities)

        // 4. Fórmula do Destaque (70/20/10)
        const highlightScore = (scorePercentage * 0.70) + (consistencyScore * 0.20) + (participationScore * 0.10)

        // 5. Persistência
        const { error } = await supabase
            .from('monthly_user_scores')
            .upsert({
                user_id: userId,
                month_ref: ref,
                track_type: track,
                points_earned: pointsEarned,
                points_available: pointsAvailable,
                score_percentage: scorePercentage,
                consistency_score: consistencyScore,
                participation_score: participationScore,
                highlight_score: highlightScore,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, month_ref' })

        if (error) throw error

        return { success: true, scorePercentage, consistencyScore, participationScore, highlightScore }
    } catch (err: any) {
        console.error('[MonthlyScoreV2] Erro:', err.message)
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

        // Ranking Mensal (Top 3 Positivo para Operador)
        const rankingRes = await getMonthlyRankingAction(userId)

        return {
            success: true,
            monthRef: ref,
            score: scoreData?.score_percentage || 0,
            consistency: scoreData?.consistency_score || 0,
            participation: scoreData?.participation_score || 0,
            highlightScore: scoreData?.highlight_score || 0,
            pointsEarned: scoreData?.points_earned || 0,
            pointsAvailable: scoreData?.points_available || 0,
            rankPosition: rankingRes.userPosition,
            top3: rankingRes.top3, // POLÍTICA: Top 3
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
            .select('user_id, score_percentage, highlight_score, points_earned, users(name)')
            .eq('month_ref', ref)
            .order('highlight_score', { ascending: false })

        if (error) throw error

        const ranking = scores.map((s, idx) => ({
            userId: s.user_id,
            name: (s.users as any)?.name || 'Operador',
            score: s.score_percentage,
            points: s.points_earned,
            rank: idx + 1
        }))

        const userPosition = userId ? ranking.findIndex(r => r.userId === userId) + 1 : null
        const top3 = ranking.slice(0, 3) // POLÍTICA: Reduzido para Top 3

        let fullRanking = []
        if (!userId) {
            try {
                // Tenta validar se é gestor para liberar a lista completa
                await requireManagerOrAdmin()
                fullRanking = ranking
            } catch (e) {
                // Se não for gestor e chamou sem userId, retorna vazio por segurança
                fullRanking = []
            }
        }

        return {
            success: true,
            top3,
            ranking: fullRanking, // Retorna ranking completo apenas para gestores autenticados
            userPosition
        }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}
