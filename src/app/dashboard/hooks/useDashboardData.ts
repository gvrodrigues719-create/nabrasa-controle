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

    useEffect(() => {
        if (!userId && !isDemoMode) {
            setLoadingData(false)
            return
        }

        async function loadData() {
            setLoadingData(true)
            const startTime = performance.now()
            
            const [healthRes, routinesRes, sessionRes, summaryRes, cmvRes, lastSealRes, focusRes, noticeRes] = await Promise.all([
                getOperationalHealthAction(),
                getActiveRoutinesAction(),
                userId
                    ? supabase
                        .from('count_sessions')
                        .select('id, routine_id, group_id, routines:routine_id(name), groups:group_id(name)')
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
                getActiveNoticesAction()
            ])

            if (healthRes.success) {
                setHealthScore(healthRes.score)
                setActiveLeaks(healthRes.activeLeaks || [])
                setWeeklyLeaks(healthRes.weeklyLeaks || [])
            }
            setRoutinesCount(routinesRes.data?.length || 0)
            
            if (sessionRes.data) {
                const s = sessionRes.data as any
                setCurrentGroupId(s.group_id)
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

            if (summaryRes.success) {
                setUserPoints((summaryRes as any).totalPoints ?? 0)
                setWeeklyPoints((summaryRes as any).weeklyPoints ?? 0)
                setRankPosition((summaryRes as any).rankPosition ?? null)
            }
            if (cmvRes.success) setCmvStatus((cmvRes as any).data)
            if (lastSealRes.success) setLastSealing((lastSealRes as any).data)
            if (focusRes.success) setWeeklyFocus((focusRes as any).data as WeeklyFocus)
            if (noticeRes.success) setNotices(noticeRes.data || [])

            // Calcular Atrasos (Sessões > 2h)
            if (routinesRes.data) {
                const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000)
                const late = (routinesRes.data as any[]).filter(s => 
                    s.status === 'in_progress' && new Date(s.started_at).getTime() < twoHoursAgo
                ).length
                setLateCount(late)
            }

            if (isDemoMode) {
                setHealthScore(84)
                setRoutinesCount(2)
                setLateCount(1)
                setNotices([
                    {
                        id: 'demo-1',
                        title: 'Reposição de Insumos: Alfaces',
                        message: 'O estoque de alface está baixo no setor de saladas. Favor priorizar reposição na próxima hora.',
                        type: 'item_em_falta',
                        priority: 'importante',
                        created_at: new Date().toISOString(),
                        users: { name: 'Mestre da Brasa' }
                    }
                ])
                
                // Add a demo active session
                setActiveSession({
                    sessionId: 'demo-session',
                    routineId: 'routine-1',
                    groupId: 'group-1',
                    routineName: 'Contagem de Estoque',
                    groupName: 'Câmara Fria'
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
        loadingData,
        setWeeklyFocus
    }
}
