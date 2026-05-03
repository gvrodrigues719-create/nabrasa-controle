'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Header from './components/operator/Header'
import { ChefHat } from 'lucide-react'

// Hooks — Two-Wave Loading Strategy
import { useDashboardIdentity } from './hooks/useDashboardIdentity'
import { useWave1Data } from './hooks/useWave1Data'
import { useWave2Data } from './hooks/useWave2Data'
import { useDashboardUI } from './hooks/useDashboardUI'
import { RewardProvider } from './context/RewardContext'

// Drawers
import LossRegistrationDrawer from './components/LossRegistrationDrawer'
import HouseHealthDrawer from './components/HouseHealthDrawer'
import OperationAIDrawer from './components/OperationAIDrawer'
import RewardsDrawer from './components/RewardsDrawer'

// Home Layouts
import ManagerHome from './components/manager/ManagerHome'
import OperatorHome from './components/operator/OperatorHome'

function DashboardContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const isDemoMode = searchParams.get('demo') === 'true' || searchParams.get('demo') === '1'

    // ── IDENTIDADE ──────────────────────────────────────────────────────────
    const { userRole, userName, fullName, userId, loadingIdentity } = useDashboardIdentity()

    const isManager = userRole === 'admin' || userRole === 'manager'

    // ── ONDA 1 — Blocos críticos (renderiza imediatamente após identidade) ──
    const {
        routinesCount,
        countsPending,
        checklistsPending,
        lateCount,
        activeSession,
        myAreaStats,
        actions,
        currentGroupId,
        monthlyPoints,
        rankPosition,
        loadingWave1,
        isTester
    } = useWave1Data(userId, isDemoMode)

    // ── ONDA 2 — Blocos complementares (carrega em background) ─────────────
    const {
        userPoints,
        monthlyScore,
        monthlyAvailable,
        consistency,
        participation,
        highlightScore,
        healthScore,
        activeLeaks,
        weeklyLeaks,
        cmvStatus,
        lastSealing,
        topRanking,
        weeklyFocus,
        notices,
        birthdays,
        loadingWave2,
        setWeeklyFocus
    } = useWave2Data(userId, isDemoMode, userRole)

    // ── UI STATE ─────────────────────────────────────────────────────────────
    const {
        viewMode,
        setViewMode,
        isLossDrawerOpen,
        setIsLossDrawerOpen,
        isHealthDrawerOpen,
        setIsHealthDrawerOpen,
        isAIDrawerOpen,
        setIsAIDrawerOpen,
        isRewardsDrawerOpen,
        setIsRewardsDrawerOpen
    } = useDashboardUI(userRole)

    // ── REDIRECIONAMENTO COZINHA CENTRAL ────────────────────────────────────
    useEffect(() => {
        if (!loadingIdentity && (userRole === 'kitchen' || fullName === 'Cozinha Central')) {
            router.push('/dashboard/kitchen')
        }
    }, [loadingIdentity, userRole, fullName, router])

    if (loadingIdentity) {
        return (
            <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-[#B13A2B]/10 border-t-[#B13A2B] animate-spin" />
                    <span className="text-sm font-bold text-gray-400">Identificando acesso...</span>
                </div>
            </div>
        )
    }

    // Se for cozinha, não renderiza nada na home principal (o redirect já foi disparado)
    if (userRole === 'kitchen' || fullName === 'Cozinha Central') {
        return (
            <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-[18px] bg-orange-50 flex items-center justify-center animate-bounce">
                        <ChefHat className="w-6 h-6 text-orange-600" />
                    </div>
                    <span className="text-sm font-bold text-gray-500">Direcionando para Cozinha Central...</span>
                </div>
            </div>
        )
    }

    return (
        <RewardProvider userId={userId}>
            <div className="min-h-screen bg-[#F8F7F4] pb-10" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>

                <Header
                    userName={userName}
                    isDemoMode={isDemoMode}
                    isManager={isManager}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                />

                <div className="px-5">
                    {isManager && viewMode === 'manager' ? (
                        <ManagerHome />
                    ) : (
                        <OperatorHome
                            // ── ONDA 1 — sempre presentes (ou skeleton) ─────
                            routinesCount={routinesCount}
                            countsPending={countsPending}
                            checklistsPending={checklistsPending}
                            lateCount={lateCount}
                            activeSession={activeSession}
                            myAreaStats={myAreaStats}
                            actions={actions}
                            loadingWave1={loadingWave1}
                            isTester={isTester}

                            // ── ONDA 2 — carregam depois, cards mostram skeleton ─
                            healthScore={healthScore}
                            activeLeaks={activeLeaks}
                            weeklyLeaks={weeklyLeaks}
                            cmvStatus={cmvStatus}
                            weeklyFocus={weeklyFocus}
                            monthlyScore={monthlyScore}
                            monthlyPoints={monthlyPoints}
                            monthlyAvailable={monthlyAvailable}
                            consistency={consistency}
                            participation={participation}
                            highlightScore={highlightScore}
                            totalPoints={userPoints ?? 0}
                            rankPosition={rankPosition}
                            lastSealing={lastSealing}
                            topRanking={topRanking}
                            notices={notices}
                            birthdays={birthdays}
                            loadingWave2={loadingWave2}

                            // ── Props de contexto e ação ─────────────────────
                            userRole={userRole}
                            userName={userName}
                            fullName={fullName}
                            userId={userId}
                            isDemoMode={isDemoMode}
                            onViewGlobalClick={() => setIsHealthDrawerOpen(true)}
                            onReportLoss={() => setIsLossDrawerOpen(true)}
                            onOpenRewards={() => setIsRewardsDrawerOpen(true)}
                            onOpenAI={() => setIsAIDrawerOpen(true)}
                            onUpdateFocus={async (title) => {
                                setWeeklyFocus(prev => prev ? { ...prev, title, source: 'manual' } : null)
                            }}
                        />
                    )}
                </div>

                {/* Drawers */}
                <LossRegistrationDrawer isOpen={isLossDrawerOpen} onClose={() => setIsLossDrawerOpen(false)} userId={userId} currentGroupId={currentGroupId} />
                <HouseHealthDrawer isOpen={isHealthDrawerOpen} onClose={() => setIsHealthDrawerOpen(false)} userRole={userRole} />
                <OperationAIDrawer isOpen={isAIDrawerOpen} onClose={() => setIsAIDrawerOpen(false)} userId={userId} userName={userName} />
                <RewardsDrawer isOpen={isRewardsDrawerOpen} onClose={() => setIsRewardsDrawerOpen(false)} initialBalance={userPoints ?? 0} />
            </div>
        </RewardProvider>
    )
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center animate-pulse" />}>
            <DashboardContent />
        </Suspense>
    )
}
