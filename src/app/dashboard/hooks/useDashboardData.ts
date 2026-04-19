'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getActiveRoutinesAction } from '@/app/actions/routinesAction'
import { getOperatorSummaryAction, getLastSealingAction } from '@/app/actions/gamificationAction'
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
}

export function useDashboardData(userId: string, isDemoMode: boolean) {
    const [routinesCount, setRoutinesCount] = useState<number>(0)
    const [userPoints, setUserPoints] = useState<number | null>(null)
    const [weeklyPoints, setWeeklyPoints] = useState<number | null>(null)
    const [rankPosition, setRankPosition] = useState<number | null>(null)
    const [healthScore, setHealthScore] = useState<number>(100)
    const [activeLeaks, setActiveLeaks] = useState<Leak[]>([])
    const [weeklyLeaks, setWeeklyLeaks] = useState<Leak[]>([])
    const [cmvStatus, setCmvStatus] = useState<any>(null)
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

    useEffect(() => {
        if (!userId && !isDemoMode) {
            setLoadingData(false)
            return
        }

        async function loadData() {
            setLoadingData(true)
            const startTime = performance.now()
            
            // 1. Fetch de dados básicos e alocação de área
            const [healthRes, routinesRes, sessionRes, summaryRes, cmvRes, lastSealRes, focusRes, noticeRes, userAreaRes] = await Promise.all([
                getOperationalHealthAction(),
                getActiveRoutinesAction(),
                userId
                    ? supabase
                        .from('count_sessions')
                        .select('id, routine_id, group_id, started_at, routines:routine_id(name), groups:group_id(name)')
                        .eq('status', 'in_progress')
                        .eq('user_id', userId)
                        .order('updated_at', { ascending: false })
                        .limit(1)
                        .maybeSingle()
                    : Promise.resolve({ data: null, error: null }),
                userId ? getOperatorSummaryAction(userId) : Promise.resolve({ success: false }),
                getPublicCMVStatusAction(),
                userId ? getLastSealingAction(userId) : Promise.resolve({ success: false }),
                getWeeklyFocusAction(),
                getActiveNoticesAction(),
                userId ? supabase.from('users').select('primary_group_id, groups:primary_group_id(name)').eq('id', userId).maybeSingle() : Promise.resolve({ data: null })
            ])

            // 2. Processamento de Saúde e Rotinas Gerais
            if (healthRes.success) {
                setHealthScore(healthRes.score)
                setActiveLeaks(healthRes.activeLeaks || [])
                setWeeklyLeaks(healthRes.weeklyLeaks || [])
            }
            setRoutinesCount(routinesRes.data?.length || 0)

            // 3. Processamento de Sessões Ativas e Áreas
            let currentAreaName = 'Cozinha' 
            let primaryGroupId = userAreaRes?.data?.primary_group_id
            let activeAreaDelay = 0

            if (userAreaRes?.data?.groups) {
                currentAreaName = (userAreaRes.data.groups as any).name
            }

            if (sessionRes.data) {
                const s = sessionRes.data as any
                const sessionStartTime = new Date(s.started_at).getTime()
                const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000)
                
                setCurrentGroupId(s.group_id)
                // Se a sessão ativa for de outro grupo, priorizamos o nome da sessão no Hero, 
                // mas a "Sua Área Hoje" continua sendo a primária.
                activeAreaDelay = sessionStartTime < twoHoursAgo ? 1 : 0

                setActiveSession({
                    sessionId: s.id,
                    routineId: s.routine_id,
                    groupId: s.group_id,
                    routineName: s.routines?.name || 'Rotina',
                    groupName: s.groups?.name || 'Setor'
                })
            } else {
                setActiveSession(null)
                setCurrentGroupId(undefined)
            }

            // 4. Cálculo de Pendências Reais da Área
            let areaPendingRoutines: any[] = []
            if (primaryGroupId) {
                // Busca rotinas que contêm este grupo
                const { data: groupRoutines } = await supabase
                    .from('routine_groups')
                    .select('routine_id, routines:routine_id(name, routine_type)')
                    .eq('group_id', primaryGroupId)

                if (groupRoutines) {
                    // Para cada rotina, verifica se já foi finalizada HOJE para este grupo
                    const brDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
                    const startOfDayBR = `${brDate}T03:00:00Z`

                    const { data: completedSessions } = await supabase
                        .from('count_sessions')
                        .select('routine_id')
                        .eq('group_id', primaryGroupId)
                        .eq('status', 'completed')
                        .gte('started_at', startOfDayBR)

                    const completedRoutineIds = new Set(completedSessions?.map(s => s.routine_id) || [])
                    areaPendingRoutines = groupRoutines.filter(gr => !completedRoutineIds.has(gr.routine_id))
                }
            }

            const nextRoutine = areaPendingRoutines[0]
            setMyAreaStats({
                name: currentAreaName,
                pendingCount: areaPendingRoutines.length,
                delayCount: activeAreaDelay,
                nextActionLabel: nextRoutine 
                    ? `Iniciar ${nextRoutine.routines.name}` 
                    : 'Checklist de encerramento',
                nextActionUrl: nextRoutine 
                    ? `/dashboard/count/${nextRoutine.routineId}/${primaryGroupId}` 
                    : undefined
            })

            // 5. Restante dos Estados
            if (summaryRes.success) {
                setUserPoints((summaryRes as any).totalPoints ?? 0)
                setWeeklyPoints((summaryRes as any).weeklyPoints ?? 0)
                setRankPosition((summaryRes as any).rankPosition ?? null)
            }
            if (cmvRes.success) setCmvStatus((cmvRes as any).data)
            if (lastSealRes.success) setLastSealing((lastSealRes as any).data)
            if (focusRes.success) setWeeklyFocus((focusRes as any).data as WeeklyFocus)
            if (noticeRes.success) setNotices(noticeRes.data || [])

            if (routinesRes.data) {
                const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000)
                const late = (routinesRes.data as any[]).filter(s => 
                    s.status === 'in_progress' && new Date(s.started_at).getTime() < twoHoursAgo
                ).length
                setLateCount(late)
            }

            if (isDemoMode) {
                // Demo Force para "Sua Área Hoje"
                setMyAreaStats({
                    name: 'Cozinha (Carnes)',
                    pendingCount: 2,
                    delayCount: 1,
                    nextActionLabel: 'Finalizar contagem de carnes',
                    nextActionUrl: '/dashboard/count/demo-routine/group-1'
                })
            }

            const endTime = performance.now()
            console.log(`[PERF] Dashboard data loaded in ${(endTime - startTime).toFixed(2)}ms`)
            setLoadingData(false)
        }
        loadData()
    }, [userId, isDemoMode])

    return {
        routinesCount,
        userPoints,
        weeklyPoints,
        rankPosition,
        healthScore,
        activeLeaks,
        weeklyLeaks,
        cmvStatus,
        lastSealing,
        topRanking,
        weeklyFocus,
        currentGroupId,
        activeSession,
        notices,
        lateCount,
        myAreaStats,
        loadingData,
        setWeeklyFocus
    }
}
