"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getSafeReturnTo, appendReturnTo } from '@/lib/navigation'
import { ArrowLeft, ClipboardList, User, Target, CheckCircle2, LayoutDashboard, Trophy, Medal, Crown, Zap, ListChecks } from 'lucide-react'
import { getActiveRoutinesAction } from '@/app/actions/routinesAction'
import { supabase } from '@/lib/supabase/client'
import { getActiveOperator } from '@/app/actions/pinAuth'
import { getOperatorSummaryAction, RankingEntry } from '@/app/actions/gamificationAction'
import { useDashboardUI } from '../hooks/useDashboardUI'
import Header from '../components/operator/Header'

type Routine = {
    id: string
    name: string
    frequency: string
    routine_type: 'count' | 'checklist'
}

const freqLabel: Record<string, string> = {
    daily: 'Rotina diária',
    weekly: 'Rotina semanal',
    monthly: 'Rotina mensal',
}

function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Bom turno'
}

export default function ActiveRoutinesPage() {
    const [routines, setRoutines] = useState<Routine[]>([])
    const [userName, setUserName] = useState('')
    const [userRoleLabel, setUserRoleLabel] = useState('')
    const [rawRole, setRawRole] = useState('')
    const [uId, setUId] = useState('')
    const [userPoints, setUserPoints] = useState<number | null>(null)
    const [weeklyPoints, setWeeklyPoints] = useState<number | null>(null)
    const [rankPosition, setRankPosition] = useState<number | null>(null)
    const [top3, setTop3] = useState<RankingEntry[]>([])
    const [loading, setLoading] = useState(true)
    const { viewMode, setViewMode } = useDashboardUI(rawRole)
    const searchParams = useSearchParams()
    const returnTo = searchParams.get('returnTo')
    const backUrl = getSafeReturnTo(returnTo, '/dashboard')

    useEffect(() => {
        async function load() {
            // Fetch routines
            const res = await getActiveRoutinesAction()
            setRoutines(res.data || [])

            // Fetch user info (operator session)
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
                    } else {
                        setUserName(user.email?.split('@')[0] || '')
                        setRawRole('operator')
                        setUserRoleLabel('Usuário')
                    }
                }
            }

            setUId(currentUserId)

            if (currentUserId) {
                const summary = await getOperatorSummaryAction(currentUserId)
                if (summary.success) {
                    setUserPoints(summary.totalPoints ?? 0)
                    setWeeklyPoints(summary.weeklyPoints ?? 0)
                    setRankPosition(summary.rankPosition ?? null)
                    setTop3(summary.top3 ?? [])
                }
            }

            setLoading(false)
        }
        load()
    }, [])

    return (
        <div className="min-h-screen bg-[#F8F7F4] text-[#1b1c1a]" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>

            {/* ── HEADER & IDENTIDADE ── */}
            <Header 
                userName={userName}
                isDemoMode={false} // Routines don't typically use demo param but could be added
                isManager={rawRole === 'admin' || rawRole === 'manager'}
                viewMode={viewMode}
                setViewMode={setViewMode}
                showBack={true}
                backUrl={backUrl}
            />

            <div className="px-5 py-6 space-y-8">

                {/* ── CARD MINHA OPERAÇÃO & RANKING ── */}
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
                                ) : weeklyPoints && weeklyPoints > 0 ? (
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
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-red-50 rounded-xl text-[#b13a2b]">
                                    <Trophy className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-[#1b1c1a]">Minha Evolução</h3>
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

                {/* ── LISTA DE ROTINAS ATIVAS ── */}
                <div>
                    <div className="flex items-center justify-between px-1 mb-4">
                        <h2 className="text-sm font-bold text-[#8c716c] uppercase tracking-[0.15em]">Minhas Rotinas</h2>
                        <span className="text-[10px] font-black text-[#b13a2b] uppercase tracking-widest">{routines.length} Ativas</span>
                    </div>

                    {!loading && routines.length === 0 ? (
                        <div className="text-center py-12 px-4 bg-white rounded-3xl border border-[#e9e8e5] border-dashed">
                            <ClipboardList className="w-12 h-12 mx-auto text-[#dfbfba] mb-3" />
                            <p className="font-bold text-[#58413e]">Nenhuma rotina ativa no momento.</p>
                            <p className="text-xs text-[#8c716c] mt-1">Ótimo trabalho! Você está em dia.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {routines.map(r => (
                                <div key={r.id} className="group bg-white rounded-[32px] p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-[#e9e8e5] hover:border-[#b13a2b]/30 transition-all active:scale-[0.98]">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="inline-block bg-[#F8F7F4] text-[#8c716c] text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider border border-[#eeedea]">
                                            {freqLabel[r.frequency] || r.frequency}
                                        </span>
                                        <div className="w-8 h-8 bg-[#FDF0EF] rounded-full flex items-center justify-center">
                                            <div className="w-2 h-2 bg-[#B13A2B] rounded-full animate-pulse" />
                                        </div>
                                    </div>

                                    <h3 className="font-black text-[#1b1c1a] text-lg leading-tight mb-5 px-1">
                                        {r.name}
                                    </h3>

                                    <Link
                                        href={appendReturnTo(`/dashboard/routines/${r.id}`, "/dashboard/routines")}
                                        className="flex items-center justify-center space-x-2 w-full text-white font-bold py-4 rounded-2xl text-base transition-all shadow-lg active:scale-95 border-b-4 border-black/20"
                                        style={{ background: 'linear-gradient(135deg, #1b1c1a 0%, #2d2e2b 100%)' }}
                                    >
                                        <span>Iniciar Rotina</span>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── PRÓXIMAS ROTINAS (EM BREVE) ── */}
                <div>
                    <div className="flex items-center justify-between px-1 mb-4">
                        <h2 className="text-sm font-bold text-[#8c716c] uppercase tracking-[0.15em]">Próxima rotina</h2>
                    </div>
                    
                    <div className="bg-[#F8F7F4]/50 rounded-[32px] p-6 border border-[#e9e8e5] border-dashed flex items-center justify-between opacity-80">
                        <div className="flex items-center space-x-4">
                            <div className="w-14 h-14 rounded-2xl bg-white border border-[#eeedea] flex items-center justify-center text-gray-400">
                                <ListChecks className="w-7 h-7" />
                            </div>
                            <div>
                                <div className="flex items-center space-x-2 mb-0.5">
                                    <h3 className="font-bold text-gray-500 text-lg leading-none">Checklist Operacional</h3>
                                    <span className="text-[9px] font-black text-white bg-gray-400 px-1.5 py-0.5 rounded uppercase tracking-widest">Em breve</span>
                                </div>
                                <p className="text-xs text-gray-400 font-medium leading-tight">Padronização de abertura e fechamento</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
