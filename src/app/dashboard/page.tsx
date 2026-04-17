'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { ShieldCheck, Settings, Flame, TrendingUp, ArrowRight, Sparkles, LayoutGrid } from 'lucide-react'
import { getActiveOperator } from '@/app/actions/pinAuth'
import { getActiveRoutinesAction } from '@/app/actions/routinesAction'
import { getOperatorSummaryAction, getLastSealingAction } from '@/app/actions/gamificationAction'
import { getOperationalHealthAction, Leak } from '@/app/actions/efficiencyAction'
import { getPublicCMVStatusAction } from '@/app/actions/cmvActions'
import { getWeeklyFocusAction, updateWeeklyFocusAction, type WeeklyFocus } from '@/app/actions/weeklyFocusAction'
import LossRegistrationDrawer from './components/LossRegistrationDrawer'
import HouseHealthDrawer from './components/HouseHealthDrawer'
import OperationAIDrawer from './components/OperationAIDrawer'
import RewardsDrawer from './components/RewardsDrawer'
import OperationHeroCard from './components/OperationHeroCard'
import ExecutionBlock from './components/ExecutionBlock'
import WeeklyProgressBar from './components/WeeklyProgressBar'

function DashboardContent() {
    const searchParams = useSearchParams()
    const isDemoMode = searchParams.get('demo') === 'true' || searchParams.get('demo') === '1'

    const [userRole, setUserRole] = useState<string | null>(null)
    const [userName, setUserName] = useState<string>('')
    const [routinesCount, setRoutinesCount] = useState<number>(0)
    const [userId, setUserId] = useState<string>('')
    const [userPoints, setUserPoints] = useState<number | null>(null)
    const [weeklyPoints, setWeeklyPoints] = useState<number | null>(null)
    const [rankPosition, setRankPosition] = useState<number | null>(null)
    const [healthScore, setHealthScore] = useState<number>(100)
    const [activeLeaks, setActiveLeaks] = useState<Leak[]>([])
    const [weeklyLeaks, setWeeklyLeaks] = useState<Leak[]>([])
    const [combinedTop3, setCombinedTop3] = useState<Leak[]>([])
    const [currentGroupId, setCurrentGroupId] = useState<string | undefined>()
    const [isLossDrawerOpen, setIsLossDrawerOpen] = useState(false)
    const [isHealthDrawerOpen, setIsHealthDrawerOpen] = useState(false)
    const [loading, setLoading] = useState(true)
    const [cmvStatus, setCmvStatus] = useState<any>(null)
    const [lastSealing, setLastSealing] = useState<any>(null)
    const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(false)
    const [isRewardsDrawerOpen, setIsRewardsDrawerOpen] = useState(false)
    const [topRanking, setTopRanking] = useState<{ name: string, points: number, rank: number }[]>([])
    const [weeklyFocus, setWeeklyFocus] = useState<WeeklyFocus | null>(null)

    useEffect(() => {
        async function loadData() {
            setLoading(true)

            // PASSO 1: Resolver identidade do usuário
            const op = await getActiveOperator()
            let currentUserId = ''
            
            if (op?.name) {
                setUserName(op.name.split(' ')[0])
                setUserRole(op.role || 'operator')
                currentUserId = op.userId
                setUserId(op.userId)
            } else {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    currentUserId = user.id
                    setUserId(user.id)
                    const { data: profile } = await supabase
                        .from('users')
                        .select('role, name')
                        .eq('id', user.id)
                        .single()
                    if (profile) {
                        setUserRole(profile.role)
                        const displayName = profile.name?.split(' ')[0] || user.email?.split('@')[0] || 'você'
                        setUserName(displayName)
                    }
                }
            }

            // PASSO 2: Carregar dados independentes em paralelo
            const [healthRes, routinesRes, sessionRes, summaryRes, cmvRes, lastSealRes, focusRes] = await Promise.all([
                getOperationalHealthAction(),
                getActiveRoutinesAction(),
                currentUserId
                    ? supabase
                        .from('count_sessions')
                        .select('group_id')
                        .eq('status', 'in_progress')
                        .eq('user_id', currentUserId)
                        .order('updated_at', { ascending: false })
                        .limit(1)
                        .maybeSingle()
                    : Promise.resolve({ data: null, error: null }),
                currentUserId
                    ? getOperatorSummaryAction(currentUserId)
                    : Promise.resolve({ success: false, totalPoints: 0, weeklyPoints: 0, rankPosition: null }),
                getPublicCMVStatusAction(),
                currentUserId ? getLastSealingAction(currentUserId) : Promise.resolve({ success: false, data: null }),
                getWeeklyFocusAction()
            ])

            if (healthRes.success) {
                setHealthScore(healthRes.score)
                setActiveLeaks(healthRes.activeLeaks || [])
                setWeeklyLeaks(healthRes.weeklyLeaks || [])
                setCombinedTop3(healthRes.combinedTop3 || [])
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

            // ── SOBREPOSIÇÃO DE MODO DEMO ──
            if (isDemoMode) {
                setHealthScore(84)
                setActiveLeaks([
                    { id: 'fake-1', label: 'Ruptura: Picanha', type: 'rupture', severity: 'critical', penalty: 2 },
                    { id: 'fake-2', label: 'Atraso: Checklist Abertura', type: 'checklist', severity: 'critical', penalty: 2 }
                ])
                setWeeklyLeaks([
                    { id: 'fake-3', label: 'Perda Custo Alto: Alcatra', type: 'reported_loss', severity: 'warning', penalty: 1 }
                ])
                setCombinedTop3([
                    { id: 'fake-1', label: 'Ruptura: Picanha', type: 'rupture', severity: 'critical', penalty: 2 },
                    { id: 'fake-2', label: 'Atraso: Checklist Abertura', type: 'checklist', severity: 'critical', penalty: 2 },
                    { id: 'fake-3', label: 'Perda Custo Alto: Alcatra', type: 'reported_loss', severity: 'warning', penalty: 1 }
                ])
                setCmvStatus({ current: 0.36, target: 0.32, status: 'critical', message: '' })
                setWeeklyPoints(850)
                setRankPosition(6)
                setUserPoints(4200)
                setLastSealing({ reason: 'Checklist de abertura concluído no prazo', points: 50, created_at: new Date().toISOString() })
                setTopRanking([
                    { name: 'Dalva', points: 1540, rank: 1 },
                    { name: 'Gisele', points: 1420, rank: 2 },
                    { name: 'Dayana', points: 1280, rank: 3 },
                    { name: 'Antonia', points: 1150, rank: 4 },
                    { name: 'Caio', points: 980, rank: 5 },
                    { name: 'Rafael', points: 850, rank: 6 },
                    { name: 'Vinicius', points: 720, rank: 7 },
                    { name: 'Mayara', points: 610, rank: 8 }
                ])
                setWeeklyFocus({
                    week_start: new Date().toISOString(),
                    title: 'Reduzir desperdício em carnes nobres e registrar perdas no momento certo.',
                    source: 'suggested'
                })
                setRoutinesCount(2)
                setUserRole('operator')
                if (!userName) setUserName('Rafael')
            }

            setLoading(false)
        }
        loadData()
    }, [])

    function getGreeting() {
        const h = new Date().getHours()
        if (h < 12) return 'Bom dia'
        if (h < 18) return 'Boa tarde'
        return 'Bom turno'
    }

    const todayDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())
    const showOperatorBlocks = !loading && (userRole === 'operator' || ['admin', 'manager'].includes(userRole || ''))

    return (
        <div className="min-h-screen bg-[#F8F7F4] pb-10" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>

            {/* ═══════════════════════════════════════════════
                 BLOCO 1: HEADER COMPACTO
                 ═══════════════════════════════════════════════ */}
            <div className="flex items-center justify-between px-5 pt-7 pb-5">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white rounded-xl shadow-sm border border-[#e9e8e5] flex items-center justify-center">
                        <Flame className="w-4 h-4 text-[#B13A2B]" strokeWidth={2} fill="currentColor" />
                    </div>
                    <div>
                        <h1 className="text-lg font-extrabold text-[#1b1c1a] tracking-tight leading-tight" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                            {getGreeting()}{userName ? `, ${userName}` : ''}
                        </h1>
                        <span className="text-[10px] font-bold text-[#c0b3b1] uppercase tracking-widest">{todayDate}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isDemoMode && (
                        <div className="flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full">
                            <LayoutGrid className="w-3 h-3" />
                            <span className="text-[8px] font-black uppercase tracking-widest">Demo</span>
                        </div>
                    )}

                    {rankPosition && (weeklyPoints ?? 0) > 0 && (
                        <span className="text-[9px] font-black text-[#b13a2b] bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                            #{rankPosition}
                        </span>
                    )}

                    <div className="w-9 h-9 rounded-xl bg-white border border-[#e9e8e5] flex items-center justify-center shadow-sm">
                        <span className="text-sm font-bold text-[#B13A2B]">{userName ? userName.charAt(0).toUpperCase() : 'U'}</span>
                    </div>
                </div>
            </div>

            <div className="px-5 space-y-5">

                {/* ═══════════════════════════════════════════════
                     BLOCO 2: HERO — SAÚDE DA OPERAÇÃO
                     ═══════════════════════════════════════════════ */}
                {showOperatorBlocks && (
                    <OperationHeroCard
                        score={healthScore}
                        activeLeaks={activeLeaks}
                        weeklyLeaks={weeklyLeaks}
                        cmvCurrent={cmvStatus?.current}
                        cmvTarget={cmvStatus?.target}
                        cmvStatus={cmvStatus?.status}
                        focus={weeklyFocus}
                        userRole={userRole}
                        onViewGlobalClick={() => setIsHealthDrawerOpen(true)}
                        onUpdateFocus={async (newTitle) => {
                            const res = await updateWeeklyFocusAction(newTitle)
                            if (res.success) {
                                setWeeklyFocus(prev => prev ? { ...prev, title: newTitle, source: 'manual' } : null)
                            }
                        }}
                    />
                )}

                {/* ═══════════════════════════════════════════════
                     BLOCO 3: EXECUÇÃO — O QUE FAZER AGORA
                     ═══════════════════════════════════════════════ */}
                {showOperatorBlocks && (
                    <ExecutionBlock
                        routinesCount={routinesCount}
                        onReportLoss={() => setIsLossDrawerOpen(true)}
                    />
                )}

                {/* ═══════════════════════════════════════════════
                     BLOCO 4: PROGRESSO — MINHA SEMANA
                     ═══════════════════════════════════════════════ */}
                {showOperatorBlocks && (
                    <WeeklyProgressBar
                        weeklyPoints={weeklyPoints ?? 0}
                        totalPoints={userPoints ?? 0}
                        rankPosition={rankPosition}
                        lastSealing={lastSealing}
                        topRanking={topRanking}
                        coinBalance={isDemoMode ? 120 : 0}
                        onOpenRewards={() => setIsRewardsDrawerOpen(true)}
                    />
                )}

                {/* ═══════════════════════════════════════════════
                     BLOCO 5: APOIO — IA
                     ═══════════════════════════════════════════════ */}
                {showOperatorBlocks && (
                    <button
                        onClick={() => setIsAIDrawerOpen(true)}
                        className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-[#e9e8e5] shadow-sm active:scale-[0.98] transition-all text-left cursor-pointer group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-[#F8F7F4] flex items-center justify-center text-amber-500 group-hover:bg-amber-50 transition-colors">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-[#1b1c1a]">Ajuda da Operação</p>
                            <p className="text-[10px] text-[#c0b3b1] font-medium">Dúvidas sobre estoque, perdas e organização</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#e9e8e5] group-hover:text-[#8c716c] transition-colors" />
                    </button>
                )}

                {/* ═══════════════════════════════════════════════
                     ATALHOS GERENCIAIS (admin/manager only)
                     ═══════════════════════════════════════════════ */}
                {userRole !== null && ['admin', 'manager'].includes(userRole) && (
                    <section>
                        <p className="text-[10px] font-black text-[#8c716c] uppercase tracking-widest mb-3 px-1">Gerência & Controle</p>
                        <div className="grid grid-cols-1 gap-2.5">
                            <Link href="/dashboard/admin/cmv" className="flex items-center justify-between bg-white rounded-2xl p-3.5 border border-[#e9e8e5] active:scale-[0.98] transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-[#FDF0EF] flex items-center justify-center text-[#B13A2B]"><TrendingUp className="w-4 h-4" /></div>
                                    <span className="font-bold text-[#1b1c1a] text-sm">CMV & Compras</span>
                                </div>
                                <ArrowRight className="w-3.5 h-3.5 text-[#dfbfba]" />
                            </Link>

                            <Link href="/dashboard/admin/vendas" className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-2xl p-3.5 shadow-md active:scale-[0.98] transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white"><TrendingUp className="w-4 h-4" /></div>
                                    <span className="font-bold text-white text-sm">Módulo de Vendas</span>
                                </div>
                                <ArrowRight className="w-3.5 h-3.5 text-white/60" />
                            </Link>

                            <div className="grid grid-cols-2 gap-2.5">
                                <Link href="/dashboard/admin/reports" className="bg-white rounded-2xl p-3.5 flex items-center gap-2 border border-[#e9e8e5] active:scale-[0.98] transition-all">
                                    <ShieldCheck className="w-4 h-4 text-[#B13A2B]" />
                                    <span className="font-bold text-[#1b1c1a] text-xs">Auditoria</span>
                                </Link>
                                <Link href="/dashboard/admin" className="bg-white rounded-2xl p-3.5 flex items-center gap-2 border border-[#e9e8e5] active:scale-[0.98] transition-all">
                                    <Settings className="w-4 h-4 text-[#58413e]" />
                                    <span className="font-bold text-[#1b1c1a] text-xs">Ajustes</span>
                                </Link>
                            </div>
                        </div>
                    </section>
                )}
            </div>

            {/* Drawers */}
            <LossRegistrationDrawer isOpen={isLossDrawerOpen} onClose={() => setIsLossDrawerOpen(false)} userId={userId} currentGroupId={currentGroupId} />
            <HouseHealthDrawer isOpen={isHealthDrawerOpen} onClose={() => setIsHealthDrawerOpen(false)} />
            <OperationAIDrawer isOpen={isAIDrawerOpen} onClose={() => setIsAIDrawerOpen(false)} />
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
