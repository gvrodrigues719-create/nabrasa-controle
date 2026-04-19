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
    const [userRole, setUserRole] = useState('')
    const [uId, setUId] = useState('')
    const [userPoints, setUserPoints] = useState<number | null>(null)
    const [weeklyPoints, setWeeklyPoints] = useState<number | null>(null)
    const [rankPosition, setRankPosition] = useState<number | null>(null)
    const [top5, setTop5] = useState<RankingEntry[]>([])
    const [loading, setLoading] = useState(true)
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
                setUserRole(op.role === 'admin' ? 'Administrador' : op.role === 'manager' ? 'Gerente' : 'Operador')
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
                        setUserRole(profile.role === 'admin' ? 'Administrador' : profile.role === 'manager' ? 'Gerente' : 'Operador')
                    } else {
                        setUserName(user.email?.split('@')[0] || '')
                        setUserRole('Usuário')
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
                    setTop5(summary.top5 ?? [])
                }
            }

            setLoading(false)
        }
        load()
    }, [])

    return (
        <div className="min-h-screen bg-[#F8F7F4] text-[#1b1c1a]" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>

            {/* ── HEADER & IDENTIDADE ── */}
            <div className="bg-white border-b border-[#e9e8e5] px-5 pt-6 pb-5 shadow-sm sticky top-0 z-10">
                <div className="flex items-center justify-between mb-4">
                    <Link href={backUrl} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-[#58413e]">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-[#b13a2b] uppercase tracking-[0.2em] mb-0.5">NaBrasa</span>
                        <div className="flex items-center space-x-1.5">
                            <span className="text-sm font-extrabold text-[#1b1c1a] tracking-tight uppercase" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                                Controle Operacional
                            </span>
                            <span className="text-[8px] font-black text-[#b13a2b] bg-red-50 px-1 py-0.5 rounded border border-red-100">MOC</span>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#902216] to-[#B13A2B] flex items-center justify-center shadow-md text-white font-bold text-lg">
                        {userName ? userName.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <div className="flex-1">
                        <h1 className="text-lg font-black leading-none mb-1">
                            {getGreeting()}, {userName}
                        </h1>
                        <div className="flex items-center text-[#8c716c] space-x-1.5 text-xs font-bold uppercase tracking-wider">
                            <User className="w-3 h-3" />
                            <span>{userRole}</span>
                        </div>
                    </div>
                </div>
            </div>

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
                                    <h3 className="text-xl font-black text-[#1b1c1a]">Minha Operação</h3>
                                    <p className="text-[10px] font-bold text-[#8c716c] uppercase tracking-widest">Resumo Semanal</p>
                                </div>
                            </div>
                            <div className="text-right">
                                {loading ? (
                                    <div className="w-20 h-6 bg-gray-100 animate-pulse rounded-full" />
                                ) : weeklyPoints && weeklyPoints > 0 ? (
                                    <span className="inline-flex items-center bg-[#1b1c1a] px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest shadow-lg">
                                        # {rankPosition ?? '--'} na Posição
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center bg-[#F8F7F4] border border-[#eeedea] px-3 py-1 rounded-full text-[10px] font-bold text-[#8c716c] uppercase tracking-widest shadow-sm">
                                        Inicie sua jornada
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-[#F8F7F4] rounded-2xl p-4 border border-[#eeedea] transition-all hover:border-[#b13a2b]/20">
                                <p className="text-[10px] font-black text-[#8c716c] uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                    <Zap className="w-3 h-3 text-[#B13A2B]" /> Semana atual
                                </p>
                                <div className="flex items-baseline space-x-1">
                                    <span className="text-2xl font-black text-[#1b1c1a]">
                                        {loading ? '--' : weeklyPoints ?? 0}
                                    </span>
                                    <span className="text-[10px] font-bold text-[#8c716c]">pontos</span>
                                </div>
                                {weeklyPoints === 0 && !loading && (
                                    <p className="text-[9px] font-medium text-[#b13a2b]/60 italic mt-1">Inicie sua jornada</p>
                                )}
                            </div>
                            <div className="bg-[#F8F7F4] rounded-2xl p-4 border border-[#eeedea]">
                                <p className="text-[10px] font-black text-[#8c716c] uppercase tracking-widest mb-1.5">Total Acumulado</p>
                                <div className="flex items-baseline space-x-1">
                                    <span className="text-2xl font-black text-[#1b1c1a]">
                                        {loading ? '--' : userPoints ?? 0}
                                    </span>
                                    <span className="text-[10px] font-bold text-[#8c716c]">pontos</span>
                                </div>
                            </div>
                        </div>

                        {/* RANKING TOP 5 DISCRETO */}
                        <div className="border-t border-[#F8F7F4] pt-6">
                            <div className="flex items-center justify-between mb-4 px-1">
                                <h4 className="text-[10px] font-black text-[#8c716c] uppercase tracking-widest">Top 5 da Semana</h4>
                                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                            </div>
                            
                            {loading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-12 bg-gray-50 animate-pulse rounded-2xl" />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {top5.length === 0 ? (
                                        <div className="text-center py-4 text-[10px] font-bold text-[#8c716c] uppercase tracking-widest bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                            Aguardando pontuações
                                        </div>
                                    ) : top5.map((entry, idx) => {
                                        const isMe = entry.userId === uId
                                        return (
                                            <div key={entry.userId} className={`flex items-center justify-between p-3.5 rounded-2xl transition-all ${isMe ? 'bg-[#1b1c1a] text-white shadow-xl ring-4 ring-[#1b1c1a]/5' : 'bg-white border border-[#eeedea]'}`}>
                                                <div className="flex items-center space-x-3">
                                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${
                                                        idx === 0 ? 'bg-amber-100 text-amber-600' :
                                                        idx === 1 ? 'bg-slate-100 text-slate-500' :
                                                        idx === 2 ? 'bg-orange-100 text-orange-600' :
                                                        isMe ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-400'
                                                    }`}>
                                                        {idx + 1}
                                                    </div>
                                                    <span className={`text-sm font-bold ${isMe ? 'text-white' : 'text-[#1b1c1a]'}`}>
                                                        {entry.name.split(' ')[0]} {isMe && '(Você)'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className={`text-xs font-black ${isMe ? 'text-[#B13A2B]' : 'text-[#8c716c]'}`}>
                                                        {entry.points}
                                                    </span>
                                                    <span className={`text-[8px] font-black uppercase ${isMe ? 'text-white/40' : 'text-[#8c716c]/40'}`}>pts</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
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
