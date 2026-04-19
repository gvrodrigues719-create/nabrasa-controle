'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { getActiveNoticesAction, getWeeklyBirthdaysAction } from '@/app/actions/communicationAction'
import { Flame, Eye, Settings as SettingsIcon } from 'lucide-react'

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
    
    const [notices, setNotices] = useState<any[]>([])
    const [birthdays, setBirthdays] = useState<any[]>([])

    // 1. Identidade
    const { userRole, userName, userId, loadingIdentity } = useDashboardIdentity()

    // 2. Dados
    const {
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
        lateCount,
        myAreaStats,
        actions,
        loadingData,
        setWeeklyFocus
    } = useDashboardData(userId, isDemoMode)

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

    function getGreeting() {
        const h = new Date().getHours()
        if (h < 12) return 'Bom dia'
        if (h < 18) return 'Boa tarde'
        return 'Bom turno'
    }

    const isManager = userRole === 'admin' || userRole === 'manager'
    const loading = loadingIdentity || loadingData

    return (
        <RewardProvider userId={userId}>
            <div className="min-h-screen bg-[#F8F7F4] pb-10" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>

            {/* HEADER UNIFICADO */}
            <header className="px-5 pt-8 pb-3 bg-white border-b border-gray-100 mb-6 flex flex-col gap-5 shadow-sm sticky top-0 z-30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#B13A2B] rounded-2xl flex items-center justify-center shadow-lg shadow-red-100">
                            <Flame className="w-5 h-5 text-white" fill="currentColor" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">NaBrasa Unit 1</p>
                            <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">
                                {getGreeting()}, {userName}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isDemoMode && (
                            <div className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <span className="text-[8px] font-black uppercase tracking-widest font-sans">Demo</span>
                            </div>
                        )}
                        <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center font-black text-[#B13A2B] text-sm">
                            {(userName || 'v').charAt(0).toUpperCase()}
                        </div>
                    </div>
                </div>

                {/* Switcher de Visão (Apenas Gerentes) */}
                {isManager && (
                    <div className="flex bg-gray-100 p-1 rounded-2xl">
                        <button 
                            onClick={() => setViewMode('manager')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                viewMode === 'manager' 
                                    ? 'bg-white text-gray-900 shadow-sm' 
                                    : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            <SettingsIcon className="w-3.5 h-3.5" />
                            Visão Gerente
                        </button>
                        <button 
                            onClick={() => setViewMode('operator')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                viewMode === 'operator' 
                                    ? 'bg-white text-[#B13A2B] shadow-sm' 
                                    : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            <Eye className="w-3.5 h-3.5" />
                            Ver como Operador
                        </button>
                    </div>
                )}
            </header>

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
                        weeklyPoints={weeklyPoints ?? 0}
                        totalPoints={userPoints ?? 0}
                        rankPosition={rankPosition}
                        lastSealing={lastSealing}
                        topRanking={topRanking}
                        isDemoMode={isDemoMode}
                        notices={notices}
                        birthdays={birthdays}
                        lateCount={lateCount}
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
            <HouseHealthDrawer isOpen={isHealthDrawerOpen} onClose={() => setIsHealthDrawerOpen(false)} />
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
