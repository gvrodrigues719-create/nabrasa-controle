'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ClipboardList } from 'lucide-react'
import { getActiveRoutinesAction } from '@/app/actions/routinesAction'
import { supabase } from '@/lib/supabase/client'
import { getActiveOperator } from '@/app/actions/pinAuth'

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
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            // Fetch routines
            const res = await getActiveRoutinesAction()
            setRoutines(res.data || [])

            // Fetch user name (operator cookie first, then auth)
            const op = await getActiveOperator()
            if (op?.name) {
                setUserName(op.name.split(' ')[0])
            } else {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const { data: profile } = await supabase
                        .from('users')
                        .select('name')
                        .eq('id', user.id)
                        .single()
                    if (profile?.name) setUserName(profile.name.split(' ')[0])
                    else setUserName(user.email?.split('@')[0] || '')
                }
            }
            setLoading(false)
        }
        load()
    }, [])

    return (
        <div className="min-h-screen bg-[#F5F4F1]" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>

            {/* ── HEADER ── */}
            <div className="flex items-center justify-between px-5 pt-6 pb-4">
                <Link href="/dashboard" className="p-2 bg-white rounded-xl shadow-sm border border-[#e9e8e5] text-[#58413e]">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <span className="text-base font-semibold text-[#1b1c1a]" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                    NaBrasa Controle
                </span>
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
                    <p className="text-sm text-[#58413e] mt-0.5">
                        {loading ? 'Carregando...' : `Hoje você tem ${routines.length} ${routines.length === 1 ? 'rotina' : 'rotinas'}`}
                    </p>
                </div>

                {/* ── ROUTINE CARDS ── */}
                {!loading && routines.length === 0 ? (
                    <div className="text-center py-12 px-4 bg-white rounded-2xl border border-[#e9e8e5] border-dashed">
                        <ClipboardList className="w-12 h-12 mx-auto text-[#dfbfba] mb-3" />
                        <p className="font-semibold text-[#58413e]">Nenhuma rotina ativa no momento.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {routines.map(r => (
                            <div key={r.id} className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(27,28,26,0.06)] border border-[#f0eeed]">
                                {/* Pill */}
                                <span className="inline-block bg-[#efeeeb] text-[#58413e] text-xs font-semibold px-3 py-1 rounded-full mb-3">
                                    {freqLabel[r.frequency] || r.frequency}
                                </span>

                                {/* Title */}
                                <h2 className="font-extrabold text-[#1b1c1a] text-lg leading-snug mb-4"
                                    style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                                    {r.name}
                                </h2>

                                {/* CTA */}
                                <Link
                                    href={`/dashboard/routines/${r.id}`}
                                    className="block w-full text-center text-white font-bold py-3.5 rounded-xl text-base active:scale-[0.98] transition-transform"
                                    style={{ background: 'linear-gradient(135deg, #902216 0%, #B13A2B 100%)' }}
                                >
                                    Começar
                                </Link>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── KPI TILES ── */}
                {!loading && routines.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(27,28,26,0.06)] border border-[#f0eeed]">
                            <p className="text-[10px] font-bold text-[#8c716c] uppercase tracking-widest mb-2">Rotinas hoje</p>
                            <p className="text-3xl font-extrabold text-[#1b1c1a]" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                                {routines.length}
                            </p>
                            <p className="text-xs text-[#58413e] mt-1">ativas agora</p>
                        </div>
                        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(27,28,26,0.06)] border border-[#f0eeed]">
                            <p className="text-[10px] font-bold text-[#8c716c] uppercase tracking-widest mb-2">Frequência</p>
                            <p className="text-3xl font-extrabold text-[#1b1c1a]" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                                {routines.filter(r => r.frequency === 'daily').length}
                            </p>
                            <p className="text-xs text-[#58413e] mt-1">diárias</p>
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}
