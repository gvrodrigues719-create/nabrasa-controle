'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { ClipboardList, ShieldCheck, Settings, Flame, TrendingUp } from 'lucide-react'
import { getActiveOperator } from '@/app/actions/pinAuth'

export default function DashboardPage() {
    const [userRole, setUserRole] = useState<string>('operator')
    const [userName, setUserName] = useState<string>('')

    useEffect(() => {
        async function loadProfile() {
            const op = await getActiveOperator()
            if (op?.name) {
                setUserName(op.name.split(' ')[0])
                setUserRole(op.role || 'operator')
                return
            }
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
        loadProfile()
    }, [])

    function getGreeting() {
        const h = new Date().getHours()
        if (h < 12) return 'Bom dia'
        if (h < 18) return 'Boa tarde'
        return 'Bom turno'
    }

    const roleLabel = userRole === 'operator' ? 'Operador' : userRole === 'manager' ? 'Gerente' : 'Administrador'

    return (
        <div className="min-h-screen bg-[#F5F4F1]" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>

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
                <div className="w-9 h-9 rounded-full bg-[#FDF0EF] flex items-center justify-center">
                    <span className="text-sm font-bold text-[#B13A2B]">{userName.charAt(0).toUpperCase()}</span>
                </div>
            </div>

            <div className="px-5 pb-8 space-y-6">

                {/* ── GREETING ── */}
                <div>
                    <h1 className="text-xl font-extrabold text-[#1b1c1a]" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                        {getGreeting()}{userName ? `, ${userName}` : ''}
                    </h1>
                    <p className="text-sm text-[#58413e] mt-0.5 capitalize">{roleLabel}</p>
                </div>

                {/* ── PRIMARY ACTION ── */}
                <Link
                    href="/dashboard/routines"
                    className="flex items-center gap-4 bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(27,28,26,0.06)] border border-[#f0eeed] active:scale-[0.98] transition-transform block"
                >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'linear-gradient(135deg, #902216 0%, #B13A2B 100%)' }}>
                        <ClipboardList className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                        <p className="font-extrabold text-[#1b1c1a] text-base" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                            Efetuar Contagem
                        </p>
                        <p className="text-sm text-[#8c716c] mt-0.5">Ver rotinas ativas do turno</p>
                    </div>
                    <span className="text-[#dfbfba] text-xl">→</span>
                </Link>

                {/* ── MANAGER SHORTCUTS ── */}
                {['admin', 'manager'].includes(userRole) && (
                    <>
                        <div>
                            <p className="text-[11px] font-bold text-[#8c716c] uppercase tracking-widest mb-3">Gerência</p>
                            <div className="space-y-3">
                                <Link
                                    href="/dashboard/admin/cmv"
                                    className="flex items-center gap-4 bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(27,28,26,0.06)] border border-[#f0eeed] active:scale-[0.98] transition-transform block"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-[#B13A2B] flex items-center justify-center shrink-0">
                                        <TrendingUp className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-extrabold text-[#1b1c1a] text-base" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                                            CMV & Compras
                                        </p>
                                        <p className="text-sm text-[#8c716c] mt-0.5">Acompanhe compras, faturamento e CMV do ciclo</p>
                                    </div>
                                    <span className="text-[#dfbfba] text-xl">→</span>
                                </Link>

                                <div className="grid grid-cols-2 gap-3">
                                    <Link
                                        href="/dashboard/admin/reports"
                                        className="bg-white rounded-2xl p-5 flex flex-col items-center justify-center gap-3 shadow-[0_2px_12px_rgba(27,28,26,0.06)] border border-[#f0eeed] active:scale-[0.98] transition-transform text-center"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-[#FDF0EF] flex items-center justify-center">
                                            <ShieldCheck className="w-5 h-5 text-[#B13A2B]" />
                                        </div>
                                        <span className="font-semibold text-sm text-[#1b1c1a]">Auditoria</span>
                                    </Link>
                                    <Link
                                        href="/dashboard/admin"
                                        className="bg-white rounded-2xl p-5 flex flex-col items-center justify-center gap-3 shadow-[0_2px_12px_rgba(27,28,26,0.06)] border border-[#f0eeed] active:scale-[0.98] transition-transform text-center"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-[#efeeeb] flex items-center justify-center">
                                            <Settings className="w-5 h-5 text-[#58413e]" />
                                        </div>
                                        <span className="font-semibold text-sm text-[#1b1c1a]">Configurar</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </>
                )}

            </div>
        </div>
    )
}
