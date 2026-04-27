'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getActiveRoutinesAction, getOperatorDailyTasksAction } from '@/app/actions/routinesAction'
import { getMonthlyOperatorSummaryAction } from '@/app/actions/gamificationAction'

export interface ActiveSession {
    sessionId: string
    routineId: string
    groupId: string
    routineName: string
    groupName: string
    type: 'count' | 'checklist'
}

export interface DashboardAction {
    id: string
    label: string
    description: string
    type: 'count' | 'checklist' | 'loss' | 'other'
    areaName: string
    status: 'pending' | 'overdue' | 'in_progress' | 'upcoming'
    priority: 'high' | 'medium' | 'low'
    url: string
    routineId?: string
    groupId?: string
    startedAt?: string
}

export interface DashboardActions {
    primary?: DashboardAction
    area?: DashboardAction
    overdue: DashboardAction[]
    recommended: DashboardAction[]
}

/**
 * WAVE 1 — Critical data for immediate render.
 * Fetches only what's needed for: Priority Action, Tasks, My Area, and quick evolution summary.
 */
export function useWave1Data(userId: string, isDemoMode: boolean) {
    const [routinesCount, setRoutinesCount] = useState<number>(0)
    const [countsPending, setCountsPending] = useState<number>(0)
    const [checklistsPending, setChecklistsPending] = useState<number>(0)
    const [lateCount, setLateCount] = useState<number>(0)
    const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
    const [myAreaStats, setMyAreaStats] = useState<{
        name: string
        pendingCount: number
        delayCount: number
        nextActionLabel: string
        nextActionUrl?: string
    } | null>(null)
    const [actions, setActions] = useState<DashboardActions>({
        overdue: [],
        recommended: []
    })
    const [currentGroupId, setCurrentGroupId] = useState<string | undefined>()
    const [monthlyPoints, setMonthlyPoints] = useState<number>(0)
    const [rankPosition, setRankPosition] = useState<number | null>(null)
    const [loadingWave1, setLoadingWave1] = useState(true)

    useEffect(() => {
        if (!userId && !isDemoMode) {
            setLoadingWave1(false)
            return
        }

        async function loadWave1() {
            setLoadingWave1(true)
            try {
                const startTime = performance.now()

                // Fetch sessions, routines, tasks, and compact gamification in parallel
                const [routinesRes, sessionsRes, tasksRes, monthlyRes] = await Promise.all([
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
                    userId ? getOperatorDailyTasksAction(userId) : Promise.resolve({ success: false, data: { today: [], inProgress: [] }, counts: { pendingCounts: 0, pendingChecklists: 0, todayCount: 0 } }),
                    userId ? getMonthlyOperatorSummaryAction(userId) : Promise.resolve({ success: false })
                ])

                // User area
                const userAreaRes = userId
                    ? await supabase.from('users').select('primary_group_id, groups:primary_group_id(name)').eq('id', userId).maybeSingle()
                    : { data: null }

                let currentAreaName = 'Loja'
                let primaryGroupId: string | undefined
                let activeAreaDelayCount = 0

                if (userAreaRes?.data?.groups) {
                    currentAreaName = (userAreaRes.data.groups as any).name
                }
                if (userAreaRes?.data?.primary_group_id) {
                    primaryGroupId = userAreaRes.data.primary_group_id
                }

                // Sessions
                const [countSessionRes, checklistSessionRes] = sessionsRes as any[]
                const s = countSessionRes?.data || checklistSessionRes?.data

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
                        type: countSessionRes?.data ? 'count' : 'checklist'
                    })
                } else {
                    setActiveSession(null)
                    setCurrentGroupId(undefined)
                }

                // Actions engine
                let allPotentialActions: DashboardAction[] = []
                let areaPendingCount = 0
                let countsPendingTemp = 0
                let checklistsPendingTemp = 0

                if ((tasksRes as any).success) {
                    const td = tasksRes as any
                    td.data.today.forEach((t: any) => {
                        allPotentialActions.push({
                            id: t.id, label: t.label || `Iniciar ${t.name}`,
                            description: `Setor: ${t.groupName}`, type: t.type,
                            areaName: t.groupName, status: 'pending', priority: 'medium',
                            url: t.url, routineId: t.routineId, groupId: t.groupId, startedAt: t.startedAt
                        })
                    })
                    td.data.inProgress.forEach((t: any) => {
                        allPotentialActions.push({
                            id: t.id, label: t.label || `Continuar ${t.name}`,
                            description: `Setor: ${t.groupName}`, type: t.type,
                            areaName: t.groupName, status: 'in_progress', priority: 'medium',
                            url: t.url, routineId: t.routineId, groupId: t.groupId, startedAt: t.startedAt
                        })
                    })
                    countsPendingTemp = td.counts.pendingCounts
                    checklistsPendingTemp = td.counts.pendingChecklists
                    areaPendingCount = td.counts.todayCount
                }

                // Demo override
                if (isDemoMode) {
                    allPotentialActions = [
                        { id: 'demo-1', label: 'Iniciar Contagem de Carnes', description: 'Setor: Cozinha', type: 'count', areaName: 'Cozinha', status: 'pending', priority: 'high', url: '/dashboard/count/demo-routine/group-1?returnTo=/dashboard', routineId: 'demo-routine', groupId: 'group-1' },
                        { id: 'demo-2', label: 'Checklist Abertura Salão', description: 'Setor: Salão', type: 'checklist', areaName: 'Salão', status: 'pending', priority: 'medium', url: '/dashboard/checklist/demo-template', routineId: 'demo-routine-2', groupId: 'group-2' }
                    ]
                    areaPendingCount = 2
                    countsPendingTemp = 1
                    checklistsPendingTemp = 1
                }

                const overdue = allPotentialActions.filter(a => a.status === 'overdue')
                const recommended = allPotentialActions
                    .filter(a => a.status !== 'in_progress' && a.status !== 'overdue')
                    .sort((a, b) => {
                        if (a.groupId === primaryGroupId && b.groupId !== primaryGroupId) return -1
                        if (a.groupId !== primaryGroupId && b.groupId === primaryGroupId) return 1
                        return 0
                    })

                let primaryAction: DashboardAction | undefined
                if (s && allPotentialActions.find(a => a.id === `${s.routine_id}-${s.group_id}`)) {
                    primaryAction = allPotentialActions.find(a => a.id === `${s.routine_id}-${s.group_id}`)
                } else if (overdue.length > 0) {
                    primaryAction = overdue.find(a => a.groupId === primaryGroupId) || overdue[0]
                } else if (recommended.length > 0) {
                    primaryAction = recommended.find(a => a.groupId === primaryGroupId) || recommended[0]
                }

                const areaActionsOrdered = allPotentialActions
                    .filter(a => a.groupId === primaryGroupId && a.status !== 'in_progress')
                    .sort((a, b) => (a.status === 'overdue' ? -1 : (b.status === 'overdue' ? 1 : 0)))

                const distinctAreaAction = areaActionsOrdered.find(a => a.id !== primaryAction?.id)

                setActions({ primary: primaryAction, area: distinctAreaAction, overdue, recommended: recommended.slice(0, 4) })

                setMyAreaStats(isDemoMode
                    ? { name: 'Cozinha (Carnes)', pendingCount: 2, delayCount: 1, nextActionLabel: 'Finalizar contagem de carnes', nextActionUrl: '/dashboard/count/demo-routine/group-1?returnTo=/dashboard' }
                    : {
                        name: currentAreaName, pendingCount: areaPendingCount,
                        delayCount: overdue.filter(a => a.groupId === primaryGroupId).length,
                        nextActionLabel: distinctAreaAction?.label || (areaPendingCount > 0 ? 'Foco na ação prioritária' : 'Tudo em dia'),
                        nextActionUrl: distinctAreaAction?.url
                    }
                )

                setLateCount(overdue.length)
                setRoutinesCount(areaPendingCount)
                setCountsPending(countsPendingTemp)
                setChecklistsPending(checklistsPendingTemp)

                // Gamification compact (for Minha Evolução in Wave 1)
                if ((monthlyRes as any).success) {
                    const m = monthlyRes as any
                    setMonthlyPoints(m.pointsEarned ?? 0)
                    setRankPosition(m.rankPosition ?? null)
                }

                console.log(`[WAVE1] Loaded in ${(performance.now() - startTime).toFixed(2)}ms`)
            } catch (err) {
                console.error('[WAVE1] Error loading critical data:', err)
            } finally {
                setLoadingWave1(false)
            }
        }

        loadWave1()
    }, [userId, isDemoMode])

    return {
        routinesCount, countsPending, checklistsPending,
        lateCount, activeSession, myAreaStats, actions,
        currentGroupId, monthlyPoints, rankPosition, loadingWave1
    }
}
