'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { ClipboardList, ShieldCheck, Settings, Flame, TrendingUp, Calendar, ArrowRight, ListChecks, Trophy, Zap, Star } from 'lucide-react'
import { getActiveOperator } from '@/app/actions/pinAuth'
import { getActiveRoutinesAction } from '@/app/actions/routinesAction'
import { getOperatorSummaryAction } from '@/app/actions/gamificationAction'

export default function DashboardPage() {
    const [userRole, setUserRole] = useState<string>('operator')
    const [userName, setUserName] = useState<string>('')
    const [routinesCount, setRoutinesCount] = useState<number>(0)
    const [userPoints, setUserPoints] = useState<number | null>(null)
    const [weeklyPoints, setWeeklyPoints] = useState<number | null>(null)
    const [rankPosition, setRankPosition] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadData() {
            setLoading(true)
            // Load User Data
            const op = await getActiveOperator()
            let currentUserId = ''
            
            if (op?.name) {
                setUserName(op.name.split(' ')[0])
                setUserRole(op.role || 'operator')
                currentUserId = op.userId
            } else {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    currentUserId = user.id
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

            // Load Real Stats (Routines for today)
            const routinesRes = await getActiveRoutinesAction()
            setRoutinesCount(routinesRes.data?.length || 0)

            // Load Gamification Data
            if (currentUserId) {
                const summary = await getOperatorSummaryAction(currentUserId)
                if (summary.success) {
                    setUserPoints(summary.totalPoints ?? 0)
                    setWeeklyPoints(summary.weeklyPoints ?? 0)
                    setRankPosition(summary.rankPosition ?? null)
                }
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

    const roleLabel = userRole === 'operator' ? 'Operador' : userRole === 'manager' ? 'Gerente' : 'Administrador'

    return (
        <div className="min-h-screen bg-[#F8F7F4] pb-10" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>

            {/* ── HEADER ── */}
            <div className="flex items-center justify-between px-5 pt-6 pb-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-white rounded-xl shadow-sm border border-[#e9e8e5] flex items-center justify-center">
                        <Flame className="w-4 h-4 text-[#B13A2B]" strokeWidth={2} fill="currentColor" />
                    </div>
                    <span className="font-bold text-[#1b1c1a] text-base" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                        NaBrasa Controle
                    </span>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-white border border-[#e9e8e5] flex items-center justify-center shadow-sm">
                    <span className="text-sm font-bold text-[#B13A2B]">{userName.charAt(0).toUpperCase()}</span>
                </div>
            </div>

            <div className="px-5 space-y-6">

                {/* ── CONTEXTO DO DIA ── */}
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

                {/* ── HERO DE PROGRESSO (ESTADO OPERACIONAL) ── EXIBIR APENAS PARA OPERADORES */}
                {userRole === 'operator' && (
                    <div className="bg-[#1b1c1a] rounded-[32px] p-5 shadow-2xl relative overflow-hidden group">
                        {/* Visual Decor */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#B13A2B] to-transparent opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12" />

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-2">
                                    <div className="p-1.5 bg-white/10 rounded-lg">
                                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                    </div>
                                    <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Minha Operação</span>
                                </div>
                                <Link href="/dashboard/routines" className="text-[9px] font-black text-[#B13A2B] uppercase tracking-widest bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-full transition-colors">
                                    Detalhes
                                </Link>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Pontos da semana</p>
                                    <div className="flex items-baseline space-x-1">
                                        <span className="text-3xl font-black text-white tracking-tighter">
                                            {loading ? '--' : weeklyPoints ?? 0}
                                        </span>
                                        <span className="text-xs font-bold text-[#B13A2B]">PTS</span>
                                    </div>
                                    {weeklyPoints === 0 && !loading && (
                                        <p className="text-[9px] font-medium text-white/30 italic mt-1">Inicie sua jornada</p>
                                    )}
                                </div>
                                <div className="border-l border-white/5 pl-4">
                                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Pontos totais</p>
                                    <div className="flex items-baseline space-x-1">
                                        <span className="text-xl font-bold text-white/90 tracking-tight">
                                            {loading ? '--' : userPoints ?? 0}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Progress Visual Hint */}
                            <div className="mt-5">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                                        {rankPosition && (weeklyPoints ?? 0) > 0 ? `Sua posição é #${rankPosition} na semana` : 'Sem pontuação registrada nesta semana'}
                                    </span>
                                    <span className="text-[9px] font-black text-[#B13A2B] uppercase">Meta Semanal</span>
                                </div>
                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-[#B13A2B] to-[#df3f2d] rounded-full transition-all duration-1000" 
                                        style={{ width: `${Math.min(((weeklyPoints ?? 0) / 1000) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── CARD OPERACIONAL (MOC HUB) ── */}
                <section>
                    <div className="flex items-center justify-between mb-3 px-1">
                        <p className="text-[11px] font-bold text-[#8c716c] uppercase tracking-widest">Rotinas Operacionais</p>
                    </div>
                    <div className="space-y-4">
                        {/* CARD CONTAGEM - ROTINA PRINCIPAL */}
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

                        {/* CARD CHECKLIST - SEGUNDA ROTINA REAL */}
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
                    
                    {/* FUTUROS MÓDULOS (INDICADOR SUTIL) */}
                    <div className="px-2 mt-4 text-center">
                        <p className="text-[10px] font-medium text-[#c0b3b1] italic">
                            Novas rotinas operacionais aparecerão aqui.
                        </p>
                    </div>
                </section>

                {/* ── ATALHOS GERENCIAIS (SÓ ADMIN/MANAGER) ── */}
                {['admin', 'manager'].includes(userRole) && (
                    <section className="mt-4">
                        <p className="text-[11px] font-bold text-[#8c716c] uppercase tracking-widest mb-3">Gerência & Controle</p>
                        <div className="grid grid-cols-1 gap-3">
                            <Link
                                href="/dashboard/admin/cmv"
                                className="flex items-center justify-between bg-white rounded-2xl p-4 border border-[#e9e8e5] active:scale-[0.98] transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-[#F8F7F4] flex items-center justify-center text-[#B13A2B]">
                                        <TrendingUp className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-[#1b1c1a] text-sm">CMV & Compras</p>
                                        <p className="text-[11px] text-[#8c716c]">Financeiro e Custos</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-[#dfbfba]" />
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
        </div>
    )
}

