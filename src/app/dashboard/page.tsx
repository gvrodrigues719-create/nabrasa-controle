'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { ClipboardList, ShieldCheck, Settings, Flame, TrendingUp, Calendar, ArrowRight, ListChecks, Zap, Star, LayoutGrid } from 'lucide-react'
import { getActiveOperator } from '@/app/actions/pinAuth'
import { getActiveRoutinesAction } from '@/app/actions/routinesAction'
import { getOperatorSummaryAction, getLastSealingAction } from '@/app/actions/gamificationAction'
import { getOperationalHealthAction, Leak } from '@/app/actions/efficiencyAction'
import { getPublicCMVStatusAction } from '@/app/actions/cmvActions'
import LossRegistrationDrawer from './components/LossRegistrationDrawer'
import EfficiencyReservoir from './components/EfficiencyReservoir'
import HouseHealthDrawer from './components/HouseHealthDrawer'
import HouseGoalCard from './components/HouseGoalCard'
import WeeklyFocusCard from './components/WeeklyFocusCard'
import OperatorContributionCard from './components/OperatorContributionCard'
import ActionGrid from './components/ActionGrid'
import OperationAI from './components/OperationAI'
import OperationAIDrawer from './components/OperationAIDrawer'

function DashboardContent() {
    const searchParams = useSearchParams()
    const isDemoMode = searchParams.get('demo') === 'true' || searchParams.get('demo') === '1'

    // null = ainda não sabe o role (evita flash de conteúdo com role errado)
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
    const [topRanking, setTopRanking] = useState<{ name: string, points: number, rank: number }[]>([])
    const [weeklyFocus, setWeeklyFocus] = useState<string | undefined>()

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
            const [healthRes, routinesRes, sessionRes, summaryRes, cmvRes, lastSealRes] = await Promise.all([
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
                currentUserId ? getLastSealingAction(currentUserId) : Promise.resolve({ success: false, data: null })
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

            // ── SOBREPOSIÇÃO DE MODO DEMO (Se ativo) ──
            if (isDemoMode) {
                setHealthScore(84)
                setActiveLeaks([
                    { id: 'fake-1', label: 'Picanha', type: 'reported_loss', severity: 'critical', penalty: 2 },
                    { id: 'fake-2', label: 'Alcatra', type: 'reported_loss', severity: 'critical', penalty: 2 }
                ])
                setWeeklyLeaks([
                    { id: 'fake-3', label: 'Coca 1.5L', type: 'reported_loss', severity: 'warning', penalty: 1 }
                ])
                setCombinedTop3([
                    { id: 'fake-1', label: 'Picanha', type: 'reported_loss', severity: 'critical', penalty: 2 },
                    { id: 'fake-2', label: 'Alcatra', type: 'reported_loss', severity: 'critical', penalty: 2 },
                    { id: 'fake-3', label: 'Coca 1.5L', type: 'reported_loss', severity: 'warning', penalty: 1 }
                ])
                setCmvStatus({
                    current: 0.36,
                    target: 0.32,
                    status: 'critical',
                    message: 'Atenção: Estamos acima da meta da semana.'
                })
                setWeeklyPoints(850)
                setRankPosition(6)
                setUserPoints(4200)
                setLastSealing({
                    reason: 'Checklist de abertura concluído no prazo',
                    points: 50,
                    created_at: new Date().toISOString()
                })
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
                setWeeklyFocus('Reduzir desperdício em carnes nobres e registrar perdas no momento certo.')
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

    const todayDate = new Intl.DateTimeFormat('pt-BR', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
    }).format(new Date())

    const roleLabel = !userRole ? '' : userRole === 'operator' ? 'Operador' : userRole === 'manager' ? 'Gerente' : 'Administrador'

    return (
        <div className="min-h-screen bg-[#F8F7F4] pb-10" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
            <div className="flex items-center justify-between px-5 pt-6 pb-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-white rounded-xl shadow-sm border border-[#e9e8e5] flex items-center justify-center">
                        <Flame className="w-4 h-4 text-[#B13A2B]" strokeWidth={2} fill="currentColor" />
                    </div>
                    <span className="font-bold text-[#1b1c1a] text-base" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                        NaBrasa Controle
                    </span>
                </div>
                
                {isDemoMode && (
                    <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-full animate-pulse shadow-sm">
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Cenário Demo</span>
                    </div>
                )}

                <div className="w-10 h-10 rounded-2xl bg-white border border-[#e9e8e5] flex items-center justify-center shadow-sm">
                    <span className="text-sm font-bold text-[#B13A2B]">{userName ? userName.charAt(0).toUpperCase() : 'U'}</span>
                </div>
            </div>

            <div className="px-5 space-y-6">
                <div className="pt-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[#8c716c] mb-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{todayDate}</span>
                        </div>
                        {userRole === 'operator' && rankPosition && (weeklyPoints ?? 0) > 0 && (
                            <span className="text-[10px] font-black text-[#b13a2b] uppercase tracking-widest bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                                #{rankPosition} na semana
                            </span>
                        )}
                        {userRole === 'operator' && (!rankPosition || (weeklyPoints ?? 0) === 0) && !loading && (
                             <span className="text-[10px] font-bold text-[#8c716c] uppercase tracking-widest bg-[#F5F4F1] border border-[#e9e8e5] px-2 py-0.5 rounded-full">
                                Inicie sua jornada
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl font-extrabold text-[#1b1c1a] tracking-tight" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                        {getGreeting()}{userName ? `, ${userName}` : ''}
                    </h1>
                    <div className="flex items-center space-x-2 mt-1">
                        <p className="text-sm text-[#58413e] font-medium">{roleLabel}</p>
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        <span className="text-[10px] font-black text-[#8c716c] uppercase tracking-widest">Módulo Operacional</span>
                    </div>
                </div>

                {/* ── RESERVATÓRIO DE EFICIÊNCIA (HUB CENTRAL GAMIFICADO) ── */}
                {!loading && (
                    <EfficiencyReservoir 
                        score={healthScore}
                        activeLeaks={activeLeaks}
                        weeklyLeaks={weeklyLeaks}
                        combinedTop3={combinedTop3}
                        onActionClick={() => setIsLossDrawerOpen(true)}
                        onViewGlobalClick={() => setIsHealthDrawerOpen(true)}
                    />
                )}

                {/* ── META DA CASA E FOCO (NOVO BLOCO MOC) ── */}
                {userRole === 'operator' && !loading && (
                    <div className="space-y-6">
                        {cmvStatus && (
                            <HouseGoalCard 
                                current={cmvStatus.current} 
                                target={cmvStatus.target} 
                                status={cmvStatus.status}
                                message={cmvStatus.message}
                            />
                        )}
                        <WeeklyFocusCard focus={weeklyFocus} />
                        
                        <OperatorContributionCard 
                            weeklyPoints={weeklyPoints ?? 0}
                            totalPoints={userPoints ?? 0}
                            rankPosition={rankPosition}
                            lastSealing={lastSealing}
                            topRanking={topRanking}
                        />
                    </div>
                )}

                {/* ── ROTINAS OPERACIONAIS (CENTRO DE EXECUÇÃO) ── */}
                {!loading && (userRole === 'operator' || ['admin', 'manager'].includes(userRole!)) && (
                    <section>
                        <div className="flex items-center justify-between mb-3 px-1">
                            <p className="text-[11px] font-bold text-[#8c716c] uppercase tracking-widest">Rotinas Operacionais</p>
                        </div>
                        <div className="space-y-4">
                            <Link
                                href="/dashboard/routines"
                                className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#e9e8e5] active:scale-[0.98] transition-all block relative overflow-hidden group"
                            >
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-14 h-14 rounded-2xl bg-[#FDF0EF] flex items-center justify-center text-[#B13A2B] group-hover:bg-[#B13A2B] group-hover:text-white transition-colors">
                                            <ClipboardList className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <h3 className="font-extrabold text-[#1b1c1a] text-lg leading-tight" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                                                Contagem de Estoque
                                            </h3>
                                            <p className="text-sm text-[#58413e] mt-0.5">
                                                {loading ? 'Carregando...' : routinesCount > 0 
                                                    ? `${routinesCount} ${routinesCount === 1 ? 'rotina pendente' : 'rotinas pendentes'}`
                                                    : 'MOC em dia'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-[#F8F7F4] p-2.5 rounded-xl border border-[#eeedea]">
                                        <ArrowRight className="w-5 h-5 text-[#B13A2B]" />
                                    </div>
                                </div>
                            </Link>

                            <Link 
                                href="/dashboard/checklist"
                                className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#e9e8e5] active:scale-[0.98] transition-all block relative overflow-hidden group/checklist"
                            >
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-14 h-14 rounded-2xl bg-[#F0F4FD] flex items-center justify-center text-[#2b58b1] group-hover/checklist:bg-[#2b58b1] group-hover/checklist:text-white transition-colors">
                                            <ListChecks className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <h3 className="font-extrabold text-[#1b1c1a] text-lg leading-tight" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                                                Checklist Operacional
                                            </h3>
                                            <p className="text-sm text-[#58413e] mt-0.5">Rotinas de abertura e fechamento</p>
                                        </div>
                                    </div>
                                    <div className="bg-[#F8F7F4] p-2.5 rounded-xl border border-[#eeedea]">
                                        <ArrowRight className="w-5 h-5 text-[#2b58b1]" />
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </section>
                )}

                {/* ── SUPORTE E APOIO ── */}
                {userRole === 'operator' && !loading && (
                    <div className="space-y-6">
                        <ActionGrid 
                            onReportLoss={() => setIsLossDrawerOpen(true)}
                            onViewLeaks={() => setIsHealthDrawerOpen(true)}
                        />

                        <OperationAI onClick={() => setIsAIDrawerOpen(true)} />
                    </div>
                )}

                {/* ── ATALHOS GERENCIAIS (só aparece após confirmar role) ── */}
                {userRole !== null && ['admin', 'manager'].includes(userRole) && (
                    <section className="mt-4">
                        <p className="text-[11px] font-bold text-[#8c716c] uppercase tracking-widest mb-3">Gerência & Controle</p>
                        <div className="grid grid-cols-1 gap-3">
                                <Link
                                    href="/dashboard/admin/cmv"
                                    className="flex items-center justify-between bg-white rounded-2xl p-4 border border-[#e9e8e5] active:scale-[0.98] transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-[#FDF0EF] flex items-center justify-center text-[#B13A2B]">
                                            <TrendingUp className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-[#1b1c1a] text-sm">CMV & Compras</p>
                                            <p className="text-[11px] text-[#8c716c]">Financeiro e Custos</p>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-[#dfbfba]" />
                                </Link>

                                <Link
                                    href="/dashboard/admin/vendas"
                                    className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-2xl p-4 border border-indigo-200 shadow-md active:scale-[0.98] transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                                            <TrendingUp className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm">Módulo de Vendas</p>
                                            <p className="text-[11px] text-indigo-100">Integração Takeat · Novo</p>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-white/60" />
                                </Link>

                            <div className="grid grid-cols-2 gap-3">
                                <Link
                                    href="/dashboard/admin/reports"
                                    className="bg-white rounded-2xl p-4 flex items-center gap-3 border border-[#e9e8e5] active:scale-[0.98] transition-all"
                                >
                                    <ShieldCheck className="w-4 h-4 text-[#B13A2B]" />
                                    <span className="font-bold text-[#1b1c1a] text-xs">Auditoria</span>
                                </Link>
                                <Link
                                    href="/dashboard/admin"
                                    className="bg-white rounded-2xl p-4 flex items-center gap-3 border border-[#e9e8e5] active:scale-[0.98] transition-all"
                                >
                                    <Settings className="w-4 h-4 text-[#58413e]" />
                                    <span className="font-bold text-[#1b1c1a] text-xs">Ajustes</span>
                                </Link>
                            </div>
                        </div>
                    </section>
                )}
            </div>

            <LossRegistrationDrawer 
                isOpen={isLossDrawerOpen}
                onClose={() => setIsLossDrawerOpen(false)}
                userId={userId}
                currentGroupId={currentGroupId}
            />

            <HouseHealthDrawer 
                isOpen={isHealthDrawerOpen}
                onClose={() => setIsHealthDrawerOpen(false)}
            />
            <OperationAIDrawer 
                isOpen={isAIDrawerOpen}
                onClose={() => setIsAIDrawerOpen(false)}
            />
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
