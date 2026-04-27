'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Header from './components/operator/Header'

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
    const searchParams = useSearchParams()
    const isDemoMode = searchParams.get('demo') === 'true' || searchParams.get('demo') === '1'

    // ── IDENTIDADE ──────────────────────────────────────────────────────────
    const { userRole, userName, userId, loadingIdentity } = useDashboardIdentity()

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
        loadingWave1
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

    // Só bloqueia na identidade — a mais rápida das três fases
    // Wave 1 e Wave 2 renderizam progressivamente dentro do OperatorHome
    const blockingLoading = loadingIdentity

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
                    {blockingLoading ? (
                        // Spinner mínimo — apenas enquanto não há identidade (≈ 200–400ms)
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-8 h-8 border-4 border-[#B13A2B] border-t-transparent rounded-full animate-spin" />
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4">
                                Abrindo turno...
                            </p>
                        </div>
                    ) : viewMode === 'manager' ? (
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
                <RewardsDrawer isOpen={isRewardsDrawerOpen} onClose={() => setIsRewardsDrawerOpen(false)} initialBalance={isDemoMode ? 120 : 0} />

            </div>
        </RewardProvider>
    )
}

export default function DashboardPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-[#B13A2B] border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <DashboardContent />
        </Suspense>
    )
}
