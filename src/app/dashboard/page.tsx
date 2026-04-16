'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { ClipboardList, ShieldCheck, Settings, Flame, TrendingUp, Calendar, ArrowRight } from 'lucide-react'
import { getActiveOperator } from '@/app/actions/pinAuth'
import { getActiveRoutinesAction } from '@/app/actions/routinesAction'

export default function DashboardPage() {
    const [userRole, setUserRole] = useState<string>('operator')
    const [userName, setUserName] = useState<string>('')
    const [routinesCount, setRoutinesCount] = useState<number>(0)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadData() {
            setLoading(true)
            // Load User Data
            const op = await getActiveOperator()
            if (op?.name) {
                setUserName(op.name.split(' ')[0])
                setUserRole(op.role || 'operator')
            } else {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
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
        <div className="min-h-screen bg-[#F5F4F1] pb-10" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>

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
                    <div className="flex items-center gap-1.5 text-[#8c716c] mb-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{todayDate}</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-[#1b1c1a] tracking-tight" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                        {getGreeting()}{userName ? `, ${userName}` : ''}
                    </h1>
                    <p className="text-sm text-[#58413e] mt-1 font-medium">{roleLabel} • Módulo Operacional</p>
                </div>

                {/* ── CARD OPERACIONAL (MOC HUB) ── */}
                <section>
                    <p className="text-[11px] font-bold text-[#8c716c] uppercase tracking-widest mb-3">Minha Operação</p>
                    <div className="space-y-3">
                        {/* CARD CONTAGEM - ROTINA PRINCIPAL */}
                        <Link
                            href="/dashboard/routines"
                            className="bg-white rounded-3xl p-6 shadow-[0_4px_16px_rgba(27,28,26,0.06)] border border-[#e9e8e5] active:scale-[0.98] transition-all block relative overflow-hidden group"
                        >
                            <div className="flex items-start justify-between relative z-10">
                                <div className="space-y-4">
                                    <div className="w-12 h-12 rounded-2xl bg-[#FDF0EF] flex items-center justify-center text-[#B13A2B] group-hover:bg-[#B13A2B] group-hover:text-white transition-colors">
                                        <ClipboardList className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-[#1b1c1a] text-lg leading-tight" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                                            Contagem de Estoque
                                        </h3>
                                        <p className="text-sm text-[#58413e] mt-1">
                                            {loading ? 'Calculando rotinas...' : routinesCount > 0 
                                                ? `${routinesCount} ${routinesCount === 1 ? 'rotina pendente' : 'rotinas pendentes'} para hoje`
                                                : 'Nenhuma rotina pendente hoje'
                                            }
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-[#F5F4F1] p-2 rounded-full">
                                    <ArrowRight className="w-5 h-5 text-[#B13A2B]" />
                                </div>
                            </div>
                            
                            {/* Visual Hint for Progress */}
                            {!loading && routinesCount > 0 && (
                                <div className="mt-6 pt-4 border-t border-[#f5f4f1] flex justify-between items-center text-[10px] font-bold text-[#8c716c] uppercase tracking-widest">
                                    <span>Rotina Principal MOC</span>
                                    <span className="text-[#B13A2B]">Acessar agora</span>
                                </div>
                            )}
                        </Link>

                        {/* FUTUROS MÓDULOS (INDICADOR SUTIL) */}
                        <div className="px-2">
                            <p className="text-[10px] font-medium text-[#c0b3b1] italic">
                                Futuras rotinas operacionais aparecerão aqui.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ── ATALHOS GERENCIAIS (SÓ ADMIN/MANAGER) ── */}
                {['admin', 'manager'].includes(userRole) && (
                    <section>
                        <p className="text-[11px] font-bold text-[#8c716c] uppercase tracking-widest mb-3">Gerência & Controle</p>
                        <div className="grid grid-cols-1 gap-3">
                            <Link
                                href="/dashboard/admin/cmv"
                                className="flex items-center justify-between bg-white rounded-2xl p-4 border border-[#e9e8e5] active:scale-[0.98] transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-[#F5F4F1] flex items-center justify-center text-[#B13A2B]">
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

