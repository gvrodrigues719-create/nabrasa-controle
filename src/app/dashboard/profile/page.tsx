'use client'

import { Suspense } from 'react'
import { useDashboardIdentity } from '../hooks/useDashboardIdentity'
import { useDashboardData } from '../hooks/useDashboardData'
import { RewardProvider } from '../context/RewardContext'
import { useDashboardUI } from '../hooks/useDashboardUI'
import RewardsDrawer from '../components/RewardsDrawer'
import { 
    User, LogOut, ChevronRight, Settings, 
    ShieldCheck, Trophy, Sparkles, History,
    Target, Award, LayoutGrid, Clock,
    Medal, Star, Gift
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Header from '../components/operator/Header'

function ProfileContent() {
    const { userName, userRole, userId, loadingIdentity, primaryAreaName } = useDashboardIdentity()
    
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const isDemoMode = searchParams?.get('demo') === 'true' || searchParams?.get('demo') === '1'

    const { 
        userPoints, 
        monthlyScore, 
        monthlyPoints, 
        consistency,
        participation,
        rankPosition, 
        recentActivities, 
        topRanking,
        lastSealing,
        loadingData 
    } = useDashboardData(userId, isDemoMode)

    const { viewMode, setViewMode, isRewardsDrawerOpen, setIsRewardsDrawerOpen } = useDashboardUI(userRole)

    const loading = loadingIdentity || loadingData

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8F7F4]">
                <div className="w-8 h-8 border-4 border-[#B13A2B] border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4">Sincronizando Perfil...</p>
            </div>
        )
    }

    return (
        <RewardProvider userId={userId}>
            <div className="min-h-screen bg-[#F8F7F4] pb-24 font-sans text-[#1b1c1a]">
                
                {/* 1. IDENTITY BLOCK — Premium & Clean */}
                <Header 
                    userName={userName}
                    isDemoMode={isDemoMode}
                    isManager={userRole === 'admin' || userRole === 'manager'}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                />

                {/* Profile Identity Card */}
                <div className="px-6 pb-10 bg-white border-b border-gray-100 rounded-b-[3.5rem] shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] mb-8">
                    <div className="flex items-center gap-6 pt-8">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-2xl bg-[#F8F7F4] border border-gray-50 flex items-center justify-center font-black text-[#B13A2B] text-2xl shadow-inner">
                                {(userName || 'v').charAt(0).toUpperCase()}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#1b1c1a] rounded-lg border-2 border-white flex items-center justify-center text-white">
                                <ShieldCheck className="w-3 h-3" />
                            </div>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-black tracking-tight">{userName}</h2>
                            <div className="flex items-center gap-2 mb-1">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                    {userRole === 'admin' ? 'Administrador' : userRole === 'manager' ? 'Gerente' : 'Operador'}
                                </p>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-500">
                                <LayoutGrid className="w-3 h-3" />
                                <span className="text-[10px] font-bold tracking-tight">Setor: {primaryAreaName || 'Geral'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 space-y-10">
                    
                    {/* 2. CONSOLIDATED EVOLUTION BLOCK — Balanced Weight */}
                    <section>
                        <header className="flex items-center justify-between mb-4 px-1">
                            <h3 className="text-[10px] font-black text-[#8c716c] uppercase tracking-[0.2em] flex items-center gap-2">
                                <Trophy className="w-3.5 h-3.5" /> Evolução Profissional
                            </h3>
                        </header>
                        
                        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden relative">
                            {/* Subtle background decoration */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#B13A2B] opacity-[0.03] blur-3xl rounded-full -mr-16 -mt-16" />
                            
                            <div className="flex items-center justify-between gap-6 relative">
                                <div className="flex-1">
                                    <div className="flex items-baseline gap-1 mb-1">
                                        <span className="text-3xl font-black tracking-tighter">{userPoints || 0}</span>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">pts</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Patrimônio Total</span>
                                        <div className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-50 text-[8px] font-black text-blue-600 uppercase">
                                            {monthlyPoints || 0} ESTE MÊS
                                        </div>
                                    </div>
                                </div>

                                <div className="w-px h-12 bg-gray-100" />

                                <div className="flex-1 text-right">
                                    <div className="flex items-baseline justify-end gap-1 mb-1">
                                        <span className="text-3xl font-black tracking-tighter text-[#1b1c1a]">
                                            {isRewardsDrawerOpen ? '...' : (userPoints ? Math.floor(userPoints/10) : 0)}
                                        </span>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CR</span>
                                    </div>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Saldo de Créditos</span>
                                    <p className="text-[8px] font-medium text-gray-400 mt-1">Disponíveis para resgate</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 3. RANKING & RECOGNITION (Moved from Home) */}
                    {topRanking && topRanking.length > 0 && (
                        <section>
                            <header className="flex items-center justify-between mb-4 px-1">
                                <h3 className="text-[10px] font-black text-[#8c716c] uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Trophy className="w-3.5 h-3.5 text-amber-500" /> Destaque e Reconhecimento
                                </h3>
                            </header>
                            <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden divide-y divide-gray-50 shadow-sm">
                                {topRanking.slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black ${
                                                idx === 0 ? 'bg-amber-100 text-amber-700' :
                                                idx === 1 ? 'bg-gray-100 text-gray-700' :
                                                'bg-orange-50 text-orange-700'
                                            }`}>
                                                {idx + 1}º
                                            </div>
                                            <span className="text-sm font-black text-[#1b1c1a]">{item.name}</span>
                                        </div>
                                        <div className="flex items-baseline gap-1 opacity-60">
                                            <span className="text-[12px] font-black text-[#1b1c1a]">{item.points}</span>
                                            <span className="text-[9px] font-bold text-[#8c716c] uppercase">Pts</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* 4. MERIT & ACHIEVEMENTS (Moved from Home) */}
                    {lastSealing && (
                        <section>
                            <header className="flex items-center justify-between mb-4 px-1">
                                <h3 className="text-[10px] font-black text-[#8c716c] uppercase tracking-[0.2em] flex items-center gap-2">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Conquistas Recentes
                                </h3>
                            </header>
                            <div className="p-5 rounded-[2.5rem] bg-emerald-50/40 border border-emerald-100/50 flex items-center justify-between transition-all hover:bg-emerald-50">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center border border-emerald-100 shadow-sm">
                                        <ShieldCheck className="w-6 h-6 text-emerald-600" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-none mb-1.5">Mérito Profissional</span>
                                        <p className="text-[13px] font-black text-[#1b1c1a] leading-tight">{lastSealing.reason}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-black text-emerald-700">+{lastSealing.points}</span>
                                    <p className="text-[9px] font-bold text-emerald-600/60 uppercase leading-none mt-1">Pontos</p>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* 5. RECENT OPERATIONAL HISTORY */}
                    <section>
                        <header className="flex items-center justify-between mb-4 px-1">
                            <h3 className="text-[10px] font-black text-[#8c716c] uppercase tracking-[0.2em] flex items-center gap-2">
                                <History className="w-3.5 h-3.5" /> Histórico Operacional
                            </h3>
                        </header>

                        <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
                            {recentActivities && recentActivities.length > 0 ? (
                                <div className="divide-y divide-gray-50">
                                    {recentActivities.map((activity, idx) => (
                                        <div key={idx} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
                                                    {activity.source_type.includes('count') ? <Target className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-black text-gray-900 leading-tight mb-0.5">
                                                        {activity.reason.split('!')[0]}!
                                                    </span>
                                                    <span className="text-[9px] font-medium text-gray-400 capitalize">
                                                        {activity.source_type.replace(/_/g, ' ')} • {format(new Date(activity.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs font-black text-green-600">+{activity.points}</span>
                                                <span className="text-[7px] font-black text-gray-300 uppercase tracking-widest">PONTOS</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-10 text-center">
                                    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3 text-gray-200">
                                        <Clock className="w-6 h-6" />
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nenhuma atividade recente</p>
                                </div>
                            )}
                            
                            <button className="w-full py-4 border-t border-gray-50 text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-[#B13A2B] transition-colors">
                                Ver Detalhes da Operação
                            </button>
                        </div>
                    </section>

                    {/* 6. PROGRESS & RANK POSITION */}
                    <section>
                        <header className="flex items-center justify-between mb-4 px-1">
                            <h3 className="text-[10px] font-black text-[#8c716c] uppercase tracking-[0.2em] flex items-center gap-2">
                                <Medal className="w-3.5 h-3.5" /> Score de Conformidade
                            </h3>
                        </header>

                        <div className="bg-[#1b1c1a] rounded-[2.5rem] p-6 text-white overflow-hidden relative shadow-lg">
                            <div className="absolute bottom-0 right-0 w-32 h-32 bg-[#B13A2B] opacity-10 blur-3xl rounded-full -mr-16 -mb-16" />
                            <div className="relative">
                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-2 text-[#B13A2B]">
                                        <Star className="w-4 h-4 fill-current" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Consolidação Mensal</span>
                                    </div>
                                    <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest">
                                        #{rankPosition || '--'} no Ranking
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-end justify-between gap-4">
                                        <div className="flex-1 h-2.5 bg-white/10 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-[#B13A2B] rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(177,58,43,0.5)]" 
                                                style={{ width: `${monthlyScore || 0}%` }}
                                            />
                                        </div>
                                        <div className="text-right leading-none">
                                            <span className="text-xl font-black">{Math.round(monthlyScore || 0)}%</span>
                                            <span className="text-[9px] block font-black text-white/40 uppercase">Score</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-4">
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-white/40">
                                                <span>Consistência Operacional</span>
                                                <span className="text-white">{Math.round(consistency || 0)}%</span>
                                            </div>
                                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${consistency || 0}%` }} />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-white/40">
                                                <span>Taxa de Participação</span>
                                                <span className="text-white">{Math.round(participation || 0)}%</span>
                                            </div>
                                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-green-500 rounded-full" style={{ width: `${participation || 0}%` }} />
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-white/40 font-medium leading-relaxed pt-2">
                                            Seu score final é ponderado: 70% Desempenho, 20% Consistência e 10% Participação.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 7. REWARDS & BENEFITS */}
                    <section>
                        <header className="flex items-center justify-between mb-4 px-1">
                            <h3 className="text-[10px] font-black text-[#8c716c] uppercase tracking-[0.2em] flex items-center gap-2">
                                <Gift className="w-3.5 h-3.5" /> Benefícios & Méritos
                            </h3>
                        </header>

                        <div className="bg-gradient-to-br from-white to-gray-50 rounded-[2.5rem] border border-gray-100 p-6 shadow-sm">
                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-[1.2rem] bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                        <Gift className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-black tracking-tight mb-1">Área de Benefícios</h4>
                                        <p className="text-[10px] text-gray-500 font-medium leading-relaxed mb-3">
                                            Use seus créditos conquistados para resgatar benefícios e mimos exclusivos.
                                        </p>
                                        <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-2xl border border-gray-100">
                                            <span className="text-xs font-bold text-gray-700">Saldo Atual</span>
                                            <span className="text-[10px] font-black text-amber-600">{(userPoints ? Math.floor(userPoints/10) : 0)} CR</span>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => setIsRewardsDrawerOpen(true)}
                                    className="w-full py-4 bg-[#1b1c1a] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-[#2d2e2c] transition-all shadow-lg shadow-black/10"
                                >
                                    Abrir Área de Resgate <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* 6. SETTINGS & FOOTER */}
                    <section className="pb-12">
                        <header className="flex items-center justify-between mb-4 px-1">
                            <h3 className="text-[10px] font-black text-[#8c716c] uppercase tracking-[0.2em] flex items-center gap-2">
                                <Settings className="w-3.5 h-3.5" /> Suporte & Conta
                            </h3>
                        </header>

                        <div className="space-y-3">
                            <button className="w-full bg-white p-5 rounded-[2rem] border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-all shadow-sm group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#1b1c1a]/5 transition-colors">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <span className="text-[13px] font-black text-gray-900 tracking-tight">Meus Dados Profissionais</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300" />
                            </button>

                            <button className="w-full bg-white p-5 rounded-[2rem] border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-all shadow-sm group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#1b1c1a]/5 transition-colors">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <span className="text-[13px] font-black text-gray-900 tracking-tight">Assiduidade & Escala</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300" />
                            </button>

                            <div className="pt-6 flex flex-col items-center">
                                <button className="flex items-center gap-2 px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors">
                                    <LogOut className="w-3.5 h-3.5" />
                                    Encerrar Sessão
                                </button>
                                <p className="text-[8px] font-black text-gray-300 uppercase text-center mt-6 tracking-widest leading-loose">
                                    NaBrasa Controle • v1.2.0 • MOC Mobile<br/>
                                    Operação Segura e Eficiente
                                </p>
                            </div>
                        </div>
                    </section>
                </div>

                <RewardsDrawer isOpen={isRewardsDrawerOpen} onClose={() => setIsRewardsDrawerOpen(false)} initialBalance={userPoints ? Math.floor(userPoints/10) : 0} />
            </div>
        </RewardProvider>
    )
}

export default function ProfilePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#B13A2B] border-t-transparent rounded-full animate-spin" /></div>}>
            <ProfileContent />
        </Suspense>
    )
}
