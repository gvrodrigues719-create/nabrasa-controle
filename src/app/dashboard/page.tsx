'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Flame, LayoutGrid, Eye, User, Settings as SettingsIcon } from 'lucide-react'
import { getActiveOperator } from '@/app/actions/pinAuth'
import { getActiveRoutinesAction } from '@/app/actions/routinesAction'
import { getOperatorSummaryAction, getLastSealingAction } from '@/app/actions/gamificationAction'
import { getOperationalHealthAction, Leak } from '@/app/actions/efficiencyAction'
import { getPublicCMVStatusAction } from '@/app/actions/cmvActions'
import { getWeeklyFocusAction, updateWeeklyFocusAction, type WeeklyFocus } from '@/app/actions/weeklyFocusAction'

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

    // Identidade e Fluxo
    const [userRole, setUserRole] = useState<string | null>(null)
    const [userName, setUserName] = useState<string>('')
    const [userId, setUserId] = useState<string>('')
    const [viewMode, setViewMode] = useState<'manager' | 'operator'>('manager')

    // Dados Compartilhados / Operador
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

    // UI State
    const [isLossDrawerOpen, setIsLossDrawerOpen] = useState(false)
    const [isHealthDrawerOpen, setIsHealthDrawerOpen] = useState(false)
    const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(false)
    const [isRewardsDrawerOpen, setIsRewardsDrawerOpen] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadData() {
            setLoading(true)

            // 1. Identidade
            const op = await getActiveOperator()
            let currentUserId = ''
            let role = 'operator'
            
            if (op?.name) {
                setUserName(op.name.split(' ')[0])
                role = op.role || 'operator'
                setUserRole(role)
                currentUserId = op.userId
                setUserId(op.userId)
            } else {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    currentUserId = user.id
                    setUserId(user.id)
                    const { data: profile } = await supabase.from('users').select('role, name').eq('id', user.id).single()
                    if (profile) {
                        role = profile.role || 'operator'
                        setUserRole(role)
                        setUserName(profile.name?.split(' ')[0] || 'você')
                    }
                }
            }

            // Define modo inicial baseado no role
            if (role === 'operator') {
                setViewMode('operator')
            } else {
                setViewMode('manager')
            }

            // 2. Carregar Dados
            const [healthRes, routinesRes, sessionRes, summaryRes, cmvRes, lastSealRes, focusRes] = await Promise.all([
                getOperationalHealthAction(),
                getActiveRoutinesAction(),
                currentUserId
                    ? supabase.from('count_sessions').select('group_id').eq('status', 'in_progress').eq('user_id', currentUserId).order('updated_at', { ascending: false }).limit(1).maybeSingle()
                    : Promise.resolve({ data: null, error: null }),
                currentUserId ? getOperatorSummaryAction(currentUserId) : Promise.resolve({ success: false }),
                getPublicCMVStatusAction(),
                currentUserId ? getLastSealingAction(currentUserId) : Promise.resolve({ success: false }),
                getWeeklyFocusAction()
            ])

            if (healthRes.success) {
                setHealthScore(healthRes.score)
                setActiveLeaks(healthRes.activeLeaks || [])
                setWeeklyLeaks(healthRes.weeklyLeaks || [])
            }
            setRoutinesCount(routinesRes.data?.length || 0)
            if (sessionRes.data) setCurrentGroupId(sessionRes.data.group_id)
            if (summaryRes.success) {
                setUserPoints((summaryRes as any).totalPoints ?? 0)
                setWeeklyPoints((summaryRes as any).weeklyPoints ?? 0)
                setRankPosition((summaryRes as any).rankPosition ?? null)
            }
            if (cmvRes.success) setCmvStatus((cmvRes as any).data)
            if (lastSealRes.success) setLastSealing((lastSealRes as any).data)
            if (focusRes.success) setWeeklyFocus((focusRes as any).data as WeeklyFocus)

            if (isDemoMode) {
                // Simulação Demo se necessário...
                setHealthScore(84)
                setRoutinesCount(2)
            }

            setLoading(false)
        }
        loadData()
    }, [isDemoMode])

    function getGreeting() {
        const h = new Date().getHours()
        if (h < 12) return 'Bom dia'
        if (h < 18) return 'Boa tarde'
        return 'Bom turno'
    }

    const todayDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())
    const isManager = userRole === 'admin' || userRole === 'manager'

    return (
        <div className="min-h-screen bg-[#F8F7F4] pb-10" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>

            {/* ═══════════════════════════════════════════════
                 HEADER UNIFICADO (COM CHAVE DE VISÃO)
                 ═══════════════════════════════════════════════ */}
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
                            {userName.charAt(0).toUpperCase()}
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
                        onViewGlobalClick={() => setIsHealthDrawerOpen(true)}
                        onReportLoss={() => setIsLossDrawerOpen(true)}
                        onOpenRewards={() => setIsRewardsDrawerOpen(true)}
                        onOpenAI={() => setIsAIDrawerOpen(true)}
                        onUpdateFocus={async (title) => {
                            const res = await updateWeeklyFocusAction(title)
                            if (res.success) setWeeklyFocus(prev => prev ? { ...prev, title, source: 'manual' } : null)
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
    )
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <DashboardContent />
        </Suspense>
    )
}
