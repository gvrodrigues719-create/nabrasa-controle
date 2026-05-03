"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getSafeReturnTo, appendReturnTo } from '@/lib/navigation'
import { ArrowLeft, CheckCircle2, Trophy, Crown, Zap, ListChecks } from 'lucide-react'
import { getOperatorSummaryAction, RankingEntry } from '@/app/actions/gamificationAction'
import { getOperatorDailyTasksAction } from '@/app/actions/routinesAction'
import { getActiveOperator } from '@/app/actions/pinAuth'
import { supabase } from '@/lib/supabase/client'
import { useDashboardUI } from '../hooks/useDashboardUI'
import Header from '../components/operator/Header'

const freqLabel: Record<string, string> = {
    daily: 'Rotina diária',
    weekly: 'Rotina semanal',
    monthly: 'Rotina mensal',
}

export default function ActiveRoutinesPage() {
    const [todayTasks, setTodayTasks] = useState<any[]>([])
    const [inProgressTasks, setInProgressTasks] = useState<any[]>([])
    const [otherTasks, setOtherTasks] = useState<any[]>([])
    const [isTester, setIsTester] = useState(false)
    const [loading, setLoading] = useState(true)
    
    // Identity state
    const [userName, setUserName] = useState('')
    const [rawRole, setRawRole] = useState('')
    const [userRoleLabel, setUserRoleLabel] = useState('')
    const [userId, setUserId] = useState('')
    
    // Stats state
    const [weeklyPoints, setWeeklyPoints] = useState<number | null>(null)
    const [rankPosition, setRankPosition] = useState<number | null>(null)
    const [top3, setTop3] = useState<RankingEntry[]>([])

    const { viewMode, setViewMode } = useDashboardUI(rawRole)
    const searchParams = useSearchParams()
    const returnTo = searchParams.get('returnTo')
    const backUrl = getSafeReturnTo(returnTo, '/dashboard')

    useEffect(() => {
        async function load() {
            setLoading(true)
            
            // 1. Identidade
            const op = await getActiveOperator()
            let currentUserId = ''
            
            if (op) {
                setUserName(op.name.split(' ')[0])
                setRawRole(op.role || 'operator')
                setUserRoleLabel(op.role === 'admin' ? 'Administrador' : op.role === 'manager' ? 'Gerente' : 'Operador')
                currentUserId = op.userId
            } else {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    currentUserId = user.id
                    const { data: profile } = await supabase
                        .from('users')
                        .select('name, role')
                        .eq('id', user.id)
                        .single()
                    if (profile?.name) {
                        setUserName(profile.name.split(' ')[0])
                        setRawRole(profile.role || 'operator')
                        setUserRoleLabel(profile.role === 'admin' ? 'Administrador' : profile.role === 'manager' ? 'Gerente' : 'Operador')
                    }
                }
            }
            
            setUserId(currentUserId)

            // 2. Dados Operacionais e Stats
            if (currentUserId) {
                const [summary, tasksRes] = await Promise.all([
                    getOperatorSummaryAction(currentUserId),
                    getOperatorDailyTasksAction(currentUserId)
                ])

                if (summary.success) {
                    setWeeklyPoints(summary.weeklyPoints ?? 0)
                    setRankPosition(summary.rankPosition ?? null)
                    setTop3(summary.top3 ?? [])
                }

                if (tasksRes.success && tasksRes.data) {
                    setTodayTasks(tasksRes.data.today)
                    setInProgressTasks(tasksRes.data.inProgress)
                    setOtherTasks(tasksRes.data.others)
                    setIsTester(!!tasksRes.data.isTester)
                }
            }

            setLoading(false)
        }
        load()
    }, [])

    return (
        <div className="min-h-screen bg-[#F8F7F4] text-[#1b1c1a]" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>

            <Header 
                userName={userName}
                isDemoMode={false}
                isManager={rawRole === 'admin' || rawRole === 'manager'}
                viewMode={viewMode}
                setViewMode={setViewMode}
                showBack={true}
                backUrl={backUrl}
            />

            <div className="px-5 py-6 space-y-10">

                {/* ── 1. MINHAS TAREFAS HOJE (PRIORIDADE) ── */}
                <section>
                    <div className="flex items-center justify-between px-1 mb-4">
                        <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-[#B13A2B] animate-pulse" />
                             <h2 className="text-sm font-black text-[#1b1c1a] uppercase tracking-widest">Minhas tarefas hoje</h2>
                        </div>
                        {!loading && todayTasks.length > 0 && (
                            <span className="text-[10px] font-black text-[#B13A2B] bg-red-50 px-2 py-1 rounded-lg uppercase tracking-widest">
                                {todayTasks.length} {todayTasks.length === 1 ? 'pendente' : 'pendentes'}
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2].map(i => (
                                <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-[32px]" />
                            ))}
                        </div>
                    ) : todayTasks.length === 0 && inProgressTasks.length === 0 ? (
                        <div className="text-center py-10 px-4 bg-white rounded-[32px] border border-[#e9e8e5] border-dashed">
                            <CheckCircle2 className="w-10 h-10 mx-auto text-green-200 mb-3" />
                            <p className="font-bold text-[#1b1c1a] text-sm">Tudo em dia!</p>
                            <p className="text-[10px] text-[#8c716c] mt-1 uppercase font-bold tracking-tight">Nenhuma tarefa pendente para seu setor agora.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* EM ANDAMENTO */}
                            {inProgressTasks.map(t => (
                                <div key={t.id} className="group bg-[#1b1c1a] rounded-[32px] p-6 shadow-xl relative overflow-hidden active:scale-[0.98] transition-all">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12" />
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="inline-block bg-amber-400 text-black text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider">
                                                Em andamento
                                            </span>
                                            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-amber-400">
                                                <Zap className="w-4 h-4 fill-current" />
                                            </div>
                                        </div>
                                        <h3 className="font-black text-white text-lg leading-tight mb-5">{t.name}</h3>
                                        <Link
                                            href={appendReturnTo(t.url, "/dashboard/routines")}
                                            className="flex items-center justify-center w-full bg-white text-black font-black py-4 rounded-2xl text-sm transition-all hover:bg-gray-100"
                                        >
                                            Continuar de onde parei
                                        </Link>
                                    </div>
                                </div>
                            ))}

                            {/* PENDENTES */}
                            {todayTasks.map(t => (
                                <div key={t.id} className="group bg-white rounded-[32px] p-6 shadow-sm border border-[#e9e8e5] hover:border-[#B13A2B]/30 transition-all active:scale-[0.98]">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="inline-block bg-[#F8F7F4] text-[#8c716c] text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider border border-[#eeedea]">
                                            {freqLabel[t.frequency] || t.frequency} • {t.groupName}
                                        </span>
                                    </div>
                                    <h3 className="font-black text-[#1b1c1a] text-lg leading-tight mb-5">{t.name}</h3>
                                    <Link
                                        href={appendReturnTo(t.url, "/dashboard/routines")}
                                        className="flex items-center justify-center w-full bg-[#1b1c1a] text-white font-black py-4 rounded-2xl text-sm transition-all hover:bg-black shadow-lg"
                                    >
                                        Iniciar Rotina
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* ── 2. OUTRAS ROTINAS (CATÁLOGO GERAL) ── */}
                {!loading && otherTasks.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between px-1 mb-4">
                            <h2 className="text-[10px] font-black text-[#8c716c] uppercase tracking-widest">
                                {isTester ? 'Todas as contagens da unidade' : 'Outras rotinas da unidade'}
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {otherTasks.map(t => (
                                <Link 
                                    key={t.id}
                                    href={appendReturnTo(t.url, "/dashboard/routines")}
                                    className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#e9e8e5] active:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                                            <ListChecks className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-[#1b1c1a]">{t.name}</p>
                                            <p className="text-[9px] font-bold text-[#8c716c] uppercase">{t.groupName}</p>
                                        </div>
                                    </div>
                                    <ArrowLeft className="w-4 h-4 text-gray-300 rotate-180" />
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* ── 3. CARD MINHA EVOLUÇÃO (AGORA NO FINAL) ── */}
                <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#e9e8e5] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-50/50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                    
                    <div className="relative z-10">
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center space-x-3">
                                <div className="p-3 bg-red-50 rounded-2xl text-[#b13a2b] shadow-sm">
                                    <Crown className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-[#1b1c1a]">Minha Evolução</h3>
                                    <p className="text-[10px] font-bold text-[#8c716c] uppercase tracking-widest">Foco no seu progresso</p>
                                </div>
                            </div>
                            <div className="text-right">
                                {loading ? (
                                    <div className="w-20 h-6 bg-gray-100 animate-pulse rounded-full" />
                                ) : (weeklyPoints !== null && weeklyPoints > 0) ? (
                                    <span className="inline-flex items-center bg-[#1b1c1a] px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest shadow-lg">
                                        Minha Posição: {rankPosition ?? '--'}º
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center bg-[#F8F7F4] border border-[#eeedea] px-3 py-1 rounded-full text-[10px] font-bold text-[#8c716c] uppercase tracking-widest shadow-sm">
                                        Inicie sua jornada
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-50 rounded-xl text-[#b13a2b]">
                                    <Trophy className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-bold text-[#8c716c] uppercase tracking-widest">Semana atual</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xl font-black text-[#1b1c1a] block leading-none">{weeklyPoints ?? 0}</span>
                                <span className="text-[9px] font-bold text-[#8c716c] uppercase tracking-tight">pontos</span>
                            </div>
                        </div>

                        {/* RECONHECIMENTO TOP 3 (COMPACTO) */}
                        <div className="space-y-2 border-t border-gray-50 pt-4">
                             {top3.slice(0, 3).map((entry, idx) => (
                                <div key={entry.userId} className="flex items-center justify-between py-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-gray-300">#{idx + 1}</span>
                                        <span className="text-xs font-bold text-gray-700">{entry.name.split(' ')[0]}</span>
                                    </div>
                                    <span className="text-[10px] font-black text-[#8c716c]">{entry.points} pts</span>
                                </div>
                             ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
