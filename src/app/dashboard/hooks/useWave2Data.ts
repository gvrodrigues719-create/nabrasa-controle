'use client'

import { useState, useEffect } from 'react'
import { getOperatorSummaryAction, getLastSealingAction, getUserRecentActivitiesAction, getMonthlyOperatorSummaryAction } from '@/app/actions/gamificationAction'
import { getOperationalHealthAction, Leak } from '@/app/actions/efficiencyAction'
import { getPublicCMVStatusAction } from '@/app/actions/cmvActions'
import { getWeeklyFocusAction, type WeeklyFocus } from '@/app/actions/weeklyFocusAction'
import { getActiveNoticesAction, getWeeklyBirthdaysAction } from '@/app/actions/communicationAction'

/**
 * WAVE 2 — Secondary data loaded after the home is already visible.
 * Fetches: health/leaks, CMV, gamification, ranking, notices, focus.
 */
export function useWave2Data(userId: string, isDemoMode: boolean, userRole?: string | null) {
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
    const [lastSealing, setLastSealing] = useState<any>(null)
    const [topRanking, setTopRanking] = useState<{ name: string; points: number; rank: number }[]>([])
    const [weeklyFocus, setWeeklyFocus] = useState<WeeklyFocus | null>(null)
    const [notices, setNotices] = useState<any[]>([])
    const [birthdays, setBirthdays] = useState<any[]>([])
    const [loadingWave2, setLoadingWave2] = useState(true)

    useEffect(() => {
        // Only start wave 2 after wave 1 has a userId
        if (!userId && !isDemoMode) {
            setLoadingWave2(false)
            return
        }

        async function loadWave2() {
            setLoadingWave2(true)
            try {
                const startTime = performance.now()

                const [healthRes, summaryRes, monthlySummaryRes, cmvRes, lastSealRes, focusRes, noticesRes, birthdaysRes, managerRankingRes] = await Promise.all([
                    getOperationalHealthAction(),
                    userId ? getOperatorSummaryAction(userId) : Promise.resolve({ success: false }),
                    userId ? getMonthlyOperatorSummaryAction(userId) : Promise.resolve({ success: false }),
                    getPublicCMVStatusAction(),
                    userId ? getLastSealingAction(userId) : Promise.resolve({ success: false }),
                    getWeeklyFocusAction(),
                    getActiveNoticesAction(),
                    getWeeklyBirthdaysAction(),
                    (userRole === 'admin' || userRole === 'manager')
                        ? import('@/app/actions/gamificationAction').then(m => m.getManagerRankingSummaryAction())
                        : Promise.resolve({ success: false })
                ])

                if (healthRes.success) {
                    setHealthScore(healthRes.score)
                    setActiveLeaks(healthRes.activeLeaks || [])
                    setWeeklyLeaks(healthRes.weeklyLeaks || [])
                }

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

                    if (userRole === 'admin' || userRole === 'manager') {
                        if (managerRankingRes && (managerRankingRes as any).success) {
                            setTopRanking((managerRankingRes as any).ranking.map((r: any, idx: number) => ({
                                name: r.name, points: r.points, rank: idx + 1
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
                if (noticesRes.success) setNotices(noticesRes.data || [])
                if (birthdaysRes.success) setBirthdays(birthdaysRes.data || [])

                console.log(`[WAVE2] Loaded in ${(performance.now() - startTime).toFixed(2)}ms`)
            } catch (err) {
                console.error('[WAVE2] Error loading secondary data:', err)
            } finally {
                setLoadingWave2(false)
            }
        }

        loadWave2()
    }, [userId, isDemoMode, userRole])

    return {
        userPoints, monthlyScore, monthlyPoints, monthlyAvailable,
        consistency, participation, highlightScore, rankPosition,
        healthScore, activeLeaks, weeklyLeaks, cmvStatus,
        lastSealing, topRanking, weeklyFocus, notices, birthdays,
        loadingWave2, setWeeklyFocus
    }
}
