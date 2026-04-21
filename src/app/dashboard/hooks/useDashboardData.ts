'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getActiveRoutinesAction } from '@/app/actions/routinesAction'
import { getOperatorSummaryAction, getLastSealingAction, getUserRecentActivitiesAction, getMonthlyOperatorSummaryAction } from '@/app/actions/gamificationAction'
import { getOperationalHealthAction, Leak } from '@/app/actions/efficiencyAction'
import { getPublicCMVStatusAction } from '@/app/actions/cmvActions'
import { getWeeklyFocusAction, type WeeklyFocus } from '@/app/actions/weeklyFocusAction'
import { getActiveNoticesAction } from '@/app/actions/communicationAction'
export interface ActiveSession {
    sessionId: string;
    routineId: string;
    groupId: string;
    routineName: string;
    groupName: string;
    type: 'count' | 'checklist';
}

export interface DashboardAction {
    id: string;
    label: string;
    description: string;
    type: 'count' | 'checklist' | 'loss' | 'other';
    areaName: string;
    status: 'pending' | 'overdue' | 'in_progress' | 'upcoming';
    priority: 'high' | 'medium' | 'low';
    url: string;
    routineId?: string;
    groupId?: string;
    startedAt?: string;
}

export interface DashboardActions {
    primary?: DashboardAction;
    area?: DashboardAction;
    overdue: DashboardAction[];
    recommended: DashboardAction[];
}

export function useDashboardData(userId: string, isDemoMode: boolean, userRole?: string | null) {
    const [routinesCount, setRoutinesCount] = useState<number>(0)
    const [countsPending, setCountsPending] = useState<number>(0)
    const [checklistsPending, setChecklistsPending] = useState<number>(0)
    const [userPoints, setUserPoints] = useState<number | null>(null)
    const [monthlyScore, setMonthlyScore] = useState<number>(0)
    const [monthlyPoints, setMonthlyPoints] = useState<number>(0)
    const [monthlyAvailable, setMonthlyAvailable] = useState<number>(0)
    const [consistency, setConsistency] = useState<number>(0)
    const [participation, setParticipation] = useState<number>(0)
    const [highlightScore, setHighlightScore] = useState<number>(0)
    const [rankPosition, setRankPosition] = useState<number | null>(null)
    const [healthScore, setHealthScore] = useState<number>(100)
    const [activeLeaks, setActiveLeaks] = useState<Leak[]>([])
    const [weeklyLeaks, setWeeklyLeaks] = useState<Leak[]>([])
    const [cmvStatus, setCmvStatus] = useState<any>(null)
    const [recentActivities, setRecentActivities] = useState<any[]>([])
    const [lastSealing, setLastSealing] = useState<any>(null)
    const [topRanking, setTopRanking] = useState<{ name: string, points: number, rank: number }[]>([])
    const [weeklyFocus, setWeeklyFocus] = useState<WeeklyFocus | null>(null)
    const [currentGroupId, setCurrentGroupId] = useState<string | undefined>()
    const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
    const [notices, setNotices] = useState<any[]>([])
    const [lateCount, setLateCount] = useState<number>(0)
    const [loadingData, setLoadingData] = useState(true)
    const [myAreaStats, setMyAreaStats] = useState<{
        name: string;
        pendingCount: number;
        delayCount: number;
        nextActionLabel: string;
        nextActionUrl?: string;
    } | null>(null)
    const [actions, setActions] = useState<DashboardActions>({
        overdue: [],
        recommended: []
    })

    useEffect(() => {
        if (!userId && !isDemoMode) {
            setLoadingData(false)
            return
        }

        async function loadData() {
            setLoadingData(true)
            const startTime = performance.now()
            
            // 1. Fetch de dados básicos e alocação de área
            const results = await Promise.all([
                getOperationalHealthAction(),
                getActiveRoutinesAction(),
                userId
                    ? Promise.all([
                        supabase
                            .from('count_sessions')
                            .select('id, routine_id, group_id, started_at, routines:routine_id(name), groups:group_id(name)')
                            .eq('status', 'in_progress')
                            .eq('user_id', userId)
                            .order('updated_at', { ascending: false })
                            .limit(1)
                            .maybeSingle(),
                        supabase
                            .from('checklist_sessions')
                            .select('id, routine_id, group_id, started_at, routines:routine_id(name), groups:group_id(name)')
                            .eq('status', 'in_progress')
                            .eq('user_id', userId)
                            .order('updated_at', { ascending: false })
                            .limit(1)
                            .maybeSingle()
                    ])
                    : Promise.resolve([{ data: null }, { data: null }]),
                userId ? getOperatorSummaryAction(userId) : Promise.resolve({ success: false }),
                userId ? getMonthlyOperatorSummaryAction(userId) : Promise.resolve({ success: false }),
                getPublicCMVStatusAction(),
                userId ? getLastSealingAction(userId) : Promise.resolve({ success: false }),
                getWeeklyFocusAction(),
                getActiveNoticesAction(),
                userId ? supabase.from('users').select('primary_group_id, groups:primary_group_id(name)').eq('id', userId).maybeSingle() : Promise.resolve({ data: null }),
                userId ? getUserRecentActivitiesAction(userId, 5) : Promise.resolve({ success: false, activities: [] }),
                (userRole === 'admin' || userRole === 'manager') ? import('@/app/actions/gamificationAction').then(m => m.getManagerRankingSummaryAction()) : Promise.resolve({ success: false })
            ])

            const [healthRes, routinesRes, sessionsRes, summaryRes, monthlySummaryRes, cmvRes, lastSealRes, focusRes, noticeRes, userAreaRes, historyRes, managerRankingRes] = [
                results[0], results[1], results[2], results[3], results[4], results[5], results[6], results[7], results[8], results[9], results[10], results[11]
            ]

            // 2. Processamento de Saúde e Rotinas Gerais
            if (healthRes.success) {
                setHealthScore(healthRes.score)
                setActiveLeaks(healthRes.activeLeaks || [])
                setWeeklyLeaks(healthRes.weeklyLeaks || [])
            }
            setRoutinesCount(routinesRes.data?.length || 0)

            // 3. Processamento de Sessões e Áreas
            let currentAreaName = 'Loja' 
            let primaryGroupId = userAreaRes?.data?.primary_group_id
            let activeAreaDelayCount = 0

            if (userAreaRes?.data?.groups) {
                currentAreaName = (userAreaRes.data.groups as any).name
            }

            const [countSessionRes, checklistSessionRes] = sessionsRes as any[]
            const activeCountSession = countSessionRes?.data
            const activeChecklistSession = checklistSessionRes?.data

            // Prioriza checklist session se houver (ou vice-versa, aqui optamos pela lógica do mais recente ou simplesmente o que existir)
            const s = activeCountSession || activeChecklistSession

            if (s) {
                const sessionStartTime = new Date(s.started_at).getTime()
                const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000)
                
                setCurrentGroupId(s.group_id)
                activeAreaDelayCount = sessionStartTime < twoHoursAgo ? 1 : 0

                setActiveSession({
                    sessionId: s.id,
                    routineId: s.routine_id,
                    groupId: s.group_id,
                    routineName: s.routines?.name || 'Rotina',
                    groupName: s.groups?.name || 'Setor',
                    type: activeCountSession ? 'count' : 'checklist'
                })
            } else {
                setActiveSession(null)
                setCurrentGroupId(undefined)
            }

            // 4. MOTOR DE AÇÕES (Dashboard Engine)
            let allPotentialActions: DashboardAction[] = []
            let areaPendingCount = 0
            let countsPendingTemp = 0
            let checklistsPendingTemp = 0
            
            // 4.1. Processar Rotinas Ativas (Global e Área)
            if (routinesRes.data) {
                const brDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
                const startOfDayBR = `${brDate}T03:00:00Z`

                // Buscar detalhes de grupos por rotina e sessões de hoje (ambos tipos)
                const [groupsRes, countSessionsRes, checklistSessionsRes] = await Promise.all([
                    supabase.from('routine_groups').select('routine_id, group_id, groups:group_id(name)'),
                    supabase.from('count_sessions').select('routine_id, group_id, status, started_at').gte('started_at', startOfDayBR),
                    supabase.from('checklist_sessions').select('routine_id, group_id, status, started_at').gte('started_at', startOfDayBR)
                ])

                const allGroups = groupsRes.data
                const sessionMap = new Map()
                
                countSessionsRes.data?.forEach(s => {
                    sessionMap.set(`${s.routine_id}-${s.group_id}`, s)
                })
                checklistSessionsRes.data?.forEach(s => {
                    // Se houver conflito (improvável mas possível), mantemos o que estiver em andamento
                    const key = `${s.routine_id}-${s.group_id}`
                    if (!sessionMap.has(key) || s.status === 'in_progress') {
                        sessionMap.set(key, s)
                    }
                })

                allGroups?.forEach(ag => {
                    const session = sessionMap.get(`${ag.routine_id}-${ag.group_id}`)
                    const routine = (routinesRes.data as any[]).find(r => r.id === ag.routine_id)
                    if (!routine) return

                    const isCompleted = session?.status === 'completed'
                    const isInProgress = session?.status === 'in_progress'
                    const isMyArea = ag.group_id === primaryGroupId
                    const groupName = (ag.groups as any)?.name || 'Setor'
                    const routineType = (routine.routine_type === 'checklist' ? 'checklist' : 'count') as 'count' | 'checklist'

                    if (!isCompleted) {
                        const deathLine = Date.now() - (2 * 60 * 60 * 1000)
                        const isOverdue = isInProgress && new Date(session.started_at).getTime() < deathLine
                        
                        const action: DashboardAction = {
                            id: `${ag.routine_id}-${ag.group_id}`,
                            label: isInProgress ? `Continuar ${routine.name}` : `Iniciar ${routine.name}`,
                            description: `Setor: ${groupName}`,
                            type: routineType,
                            areaName: groupName,
                            status: isInProgress ? (isOverdue ? 'overdue' : 'in_progress') : 'pending',
                            priority: isOverdue ? 'high' : (isMyArea ? 'medium' : 'low'),
                            url: `/dashboard/${routineType}/${ag.routine_id}/${ag.group_id}?returnTo=/dashboard`,
                            routineId: ag.routine_id,
                            groupId: ag.group_id,
                            startedAt: session?.started_at
                        }
                        
                        allPotentialActions.push(action)
                        if (isMyArea) {
                            areaPendingCount++
                            if (routineType === 'count') countsPendingTemp++
                            else checklistsPendingTemp++
                        }
                    }
                })
            }

            // 4.2. Priorização Final
            const overdue = allPotentialActions.filter(a => a.status === 'overdue')
            const recommended = allPotentialActions
                .filter(a => a.status !== 'in_progress' && a.status !== 'overdue')
                .sort((a, b) => {
                    // Prioridade 1: Minha Área
                    if (a.groupId === primaryGroupId && b.groupId !== primaryGroupId) return -1
                    if (a.groupId !== primaryGroupId && b.groupId === primaryGroupId) return 1
                    return 0
                })

            // Ação Primária (Hero/Zap)
            let primaryAction: DashboardAction | undefined
            if (activeSession) {
                primaryAction = allPotentialActions.find(a => a.id === `${activeSession.routineId}-${activeSession.groupId}`)
            } else if (overdue.length > 0) {
                primaryAction = overdue.find(a => a.groupId === primaryGroupId) || overdue[0]
            } else if (recommended.length > 0) {
                primaryAction = recommended.find(a => a.groupId === primaryGroupId) || recommended[0]
            }

            // Ação da Área (Garantir que seja DISTINTA da primária para evitar redundância)
            const areaActionsOrdered = allPotentialActions
                .filter(a => a.groupId === primaryGroupId && a.status !== 'in_progress')
                .sort((a, b) => (a.status === 'overdue' ? -1 : (b.status === 'overdue' ? 1 : 0)))

            const distinctAreaAction = areaActionsOrdered.find(a => a.id !== primaryAction?.id)

            setActions({
                primary: primaryAction,
                area: distinctAreaAction,
                overdue: overdue,
                recommended: recommended.slice(0, 4) 
            })

            // 5. Retrocompatibilidade (myAreaStats)
            setMyAreaStats({
                name: currentAreaName,
                pendingCount: areaPendingCount,
                delayCount: overdue.filter(a => a.groupId === primaryGroupId).length,
                nextActionLabel: distinctAreaAction?.label || (areaPendingCount > 0 ? 'Foco na ação prioritária' : 'Tudo em dia'),
                nextActionUrl: distinctAreaAction?.url
            })

            setLateCount(overdue.length)
            setCountsPending(countsPendingTemp)
            setChecklistsPending(checklistsPendingTemp)
            if (historyRes.success) setRecentActivities(historyRes.activities)

            // 6. Restante dos Estados
            if (summaryRes.success) {
                setUserPoints((summaryRes as any).totalPoints ?? 0)
            }
            if (monthlySummaryRes.success) {
                const s = monthlySummaryRes as any
                setMonthlyScore(s.score)
                setMonthlyPoints(s.pointsEarned)
                setMonthlyAvailable(s.pointsAvailable)
                setConsistency(s.consistency)
                setParticipation(s.participation)
                setHighlightScore(s.highlightScore)
                setRankPosition(s.rankPosition)
                
                // POLÍTICA: Se for gestor, usa o ranking gerencial completo. Se for operador, usa o Top 3.
                if (userRole === 'admin' || userRole === 'manager') {
                    if (managerRankingRes && (managerRankingRes as any).success) {
                        setTopRanking((managerRankingRes as any).ranking.map((r: any, idx: number) => ({
                            name: r.name,
                            points: r.points,
                            rank: idx + 1
                        })))
                    } else {
                        setTopRanking(s.top3 || [])
                    }
                } else {
                    setTopRanking(s.top3 || [])
                }
            }
            if (cmvRes.success) setCmvStatus((cmvRes as any).data)
            if (lastSealRes.success) setLastSealing((lastSealRes as any).data)
            if (focusRes.success) setWeeklyFocus((focusRes as any).data as WeeklyFocus)
            if (noticeRes.success) setNotices(noticeRes.data || [])

            if (isDemoMode) {
                // Demo Force
                setMyAreaStats({
                    name: 'Cozinha (Carnes)',
                    pendingCount: 2,
                    delayCount: 1,
                    nextActionLabel: 'Finalizar contagem de carnes',
                    nextActionUrl: '/dashboard/count/demo-routine/group-1?returnTo=/dashboard'
                })
            }

            const endTime = performance.now()
            console.log(`[PERF] Dashboard Engine loaded in ${(endTime - startTime).toFixed(2)}ms`)
            setLoadingData(false)
        }
        loadData()
    }, [userId, isDemoMode])

    return {
        routinesCount,
        countsPending,
        checklistsPending,
        userPoints,
        monthlyScore,
        monthlyPoints,
        monthlyAvailable,
        consistency,
        participation,
        highlightScore,
        rankPosition,
        healthScore,
        activeLeaks,
        weeklyLeaks,
        cmvStatus,
        lastSealing,
        topRanking,
        recentActivities,
        weeklyFocus,
        currentGroupId,
        activeSession,
        notices,
        lateCount,
        myAreaStats,
        actions,
        loadingData,
        setWeeklyFocus
    }
}
