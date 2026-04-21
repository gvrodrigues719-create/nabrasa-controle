'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { getActiveNoticesAction, getWeeklyBirthdaysAction } from '@/app/actions/communicationAction'
import { Eye } from 'lucide-react'
import Header from './components/operator/Header'

// Hooks
import { useDashboardIdentity } from './hooks/useDashboardIdentity'
import { useDashboardData } from './hooks/useDashboardData'
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
    const requestedView = searchParams.get('view')
    
    const [notices, setNotices] = useState<any[]>([])
    const [birthdays, setBirthdays] = useState<any[]>([])

    // 1. Identidade
    const { userRole, userName, userId, loadingIdentity } = useDashboardIdentity()

    // 2. Dados
    const {
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
        weeklyFocus,
        currentGroupId,
        activeSession,
        lateCount,
        myAreaStats,
        actions,
        loadingData,
        setWeeklyFocus
    } = useDashboardData(userId, isDemoMode, userRole)

    useEffect(() => {
        async function fetchData() {
            const [noticesRes, birthdaysRes] = await Promise.all([
                getActiveNoticesAction(),
                getWeeklyBirthdaysAction()
            ])
            if (noticesRes.success) setNotices(noticesRes.data || [])
            if (birthdaysRes.success) setBirthdays(birthdaysRes.data || [])
        }
        fetchData()
    }, [])

    // 3. UI State
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


    const isManager = userRole === 'admin' || userRole === 'manager'
    const loading = loadingIdentity || loadingData

    useEffect(() => {
        if (isManager && requestedView === 'operator') {
            setViewMode('operator')
        }
    }, [isManager, requestedView, setViewMode])

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
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-8 h-8 border-4 border-[#B13A2B] border-t-transparent rounded-full animate-spin" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4">Sincronizando Turno...</p>
                    </div>
                ) : viewMode === 'manager' ? (
                    <ManagerHome />
                ) : (
                    <OperatorHome 
                        healthScore={healthScore}
                        activeLeaks={activeLeaks}
                        weeklyLeaks={weeklyLeaks}
                        cmvStatus={cmvStatus}
                        weeklyFocus={weeklyFocus}
                        userRole={userRole}
                        routinesCount={routinesCount}
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
                        isDemoMode={isDemoMode}
                        notices={notices}
                        birthdays={birthdays}
                        lateCount={lateCount}
                        countsPending={countsPending}
                        checklistsPending={checklistsPending}
                        userId={userId}
                        activeSession={activeSession}
                        myAreaStats={myAreaStats}
                        actions={actions}
                        onViewGlobalClick={() => setIsHealthDrawerOpen(true)}

                        onReportLoss={() => setIsLossDrawerOpen(true)}
                        onOpenRewards={() => setIsRewardsDrawerOpen(true)}
                        onOpenAI={() => setIsAIDrawerOpen(true)}
                        onUpdateFocus={async (title) => {
                            // Placeholder for update logic
                            setWeeklyFocus(prev => prev ? { ...prev, title, source: 'manual' } : null)
                        }}
                    />
                )}
            </div>

            {/* Drawers (Compartilhados) */}
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
        <Suspense fallback={<div>Carregando...</div>}>
            <DashboardContent />
        </Suspense>
    )
}
