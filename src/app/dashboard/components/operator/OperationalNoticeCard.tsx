'use client'

import React, { useState } from 'react'
import { AlertOctagon, Info, Bell, ChevronRight, X, Cake, Gift, Sparkles } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Notice {
    id: string
    title: string
    message: string
    type: 'operacional' | 'item_em_falta' | 'promocao' | 'mudanca_de_turno' | 'comunicado_geral'
    priority: 'normal' | 'importante' | 'urgente'
    created_at: string
    users?: { name: string }
}

interface Birthday {
    id: string
    name: string
    date: string
    avatarUrl?: string
}

interface Props {
    notices: Notice[]
    birthdays?: Birthday[]
}

export default function OperationalNoticeCard({ notices, birthdays = [] }: Props) {
    const [isBirthdayDrawerOpen, setIsBirthdayDrawerOpen] = useState(false)
    const [isNoticesListOpen, setIsNoticesListOpen] = useState(false)

    if ((!notices || notices.length === 0) && (!birthdays || birthdays.length === 0)) return null

    const monthNames = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"]
    
    // ────────────── LÓGICA DE ANIVERSARIANTES ──────────────
    const getSortedBirthdays = () => {
        const now = new Date()
        const todayDay = now.getDate()
        const todayMonth = now.getMonth() + 1

        const categorized = birthdays.reduce((acc, b) => {
            const [d, m] = b.date.split('/').map(Number)
            if (d === todayDay && m === todayMonth) {
                acc.today.push(b)
            } else if (m > todayMonth || (m === todayMonth && d > todayDay)) {
                acc.upcoming.push({ ...b, day: d, month: m })
            } else {
                acc.past.push({ ...b, day: d, month: m })
            }
            return acc
        }, { today: [] as Birthday[], upcoming: [] as any[], past: [] as any[] })

        categorized.upcoming.sort((a, b) => (a.month * 100 + a.day) - (b.month * 100 + b.day))
        categorized.past.sort((a, b) => (b.month * 100 + b.day) - (a.month * 100 + a.day))

        return [...categorized.today, ...categorized.upcoming, ...categorized.past]
    }

    const sortedBirthdays = getSortedBirthdays()
    const primaryBirthday = sortedBirthdays[0]

    // ────────────── RENDERIZAÇÃO: ANIVERSÁRIOS (MURAL) ──────────────
    const renderBirthdaySection = () => {
        if (!primaryBirthday) return null
        const [dayStr, monthStr] = primaryBirthday.date.split('/')
        const monthLabel = monthNames[parseInt(monthStr) - 1]

        return (
            <div className="space-y-3">
                <p className="text-[10px] font-black text-[#8c716c] uppercase tracking-widest px-1">Mural da Casa</p>
                <div 
                    onClick={() => setIsBirthdayDrawerOpen(true)}
                    className="relative overflow-hidden rounded-[2.5rem] border border-[#e9e8e5] shadow-sm transition-all duration-300 bg-white text-[#1b1c1a] active:scale-[0.98] cursor-pointer group"
                >
                    <div className="p-6 flex items-center gap-6">
                        <div className="flex flex-col items-center justify-center w-14 h-16 bg-[#B13A2B] rounded-2xl shadow-lg shadow-red-100 shrink-0">
                            <span className="text-[9px] font-black text-white/80 uppercase mb-1 tracking-widest">{monthLabel}</span>
                            <span className="text-2xl font-black text-white leading-none">{dayStr}</span>
                        </div>

                        <div className="flex-1 space-y-2">
                             <span className="inline-flex text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 items-center gap-1 shadow-sm">
                                <Sparkles className="w-3 h-3" />
                                ANIVERSARIANTES
                            </span>
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-indigo-50 border-4 border-white shadow-md overflow-hidden flex items-center justify-center shrink-0">
                                    {primaryBirthday.avatarUrl ? (
                                        <img src={primaryBirthday.avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
                                    ) : (
                                        <Cake className="w-6 h-6 text-indigo-300" />
                                    )}
                                </div>
                                <div className="leading-tight">
                                    <h4 className="text-lg font-black tracking-tight">{primaryBirthday.name}</h4>
                                    <p className="text-[10px] text-[#8c716c] font-bold uppercase tracking-wide">
                                        {birthdays.length > 1 ? `🧑‍🤝‍🧑 +${birthdays.length - 1} na semana` : 'Parabéns!'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 opacity-20" />
                    </div>
                </div>
            </div>
        )
    }

    // ────────────── RENDERIZAÇÃO: AVISOS (QUADRO) ──────────────
    const renderNoticesSection = () => {
        if (!notices || notices.length === 0) return null

        const priorityStyles = {
            urgente: { bg: 'bg-[#B13A2B]', text: 'text-white', icon: <AlertOctagon className="w-5 h-5" /> },
            importante: { bg: 'bg-amber-100', text: 'text-amber-900', icon: <Info className="w-5 h-5" /> },
            normal: { bg: 'bg-white', text: 'text-[#1b1c1a]', icon: <Bell className="w-5 h-5" /> }
        }

        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-black text-[#8c716c] uppercase tracking-widest">Avisos e Recados</p>
                    {notices.length > 1 && (
                        <span className="text-[10px] font-black text-[#B13A2B] bg-red-50 px-2 py-0.5 rounded-full uppercase">
                           {notices.length} Ativos
                        </span>
                    )}
                </div>

                <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-4 pb-2 px-0.5">
                    {notices.map((notice, idx) => {
                        const style = priorityStyles[notice.priority] || priorityStyles.normal
                        return (
                            <div 
                                key={notice.id} 
                                className={`flex-shrink-0 ${notices.length > 1 ? 'w-[85vw]' : 'w-full'} snap-center relative overflow-hidden rounded-[2.2rem] border border-[#e9e8e5] shadow-sm ${style.bg} ${style.text}`}
                            >
                                <div className="p-5 flex gap-4 min-h-[120px]">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${notice.priority === 'urgente' ? 'bg-white/10' : 'bg-[#F8F7F4]'}`}>
                                        <div className={notice.priority === 'urgente' ? 'text-white' : 'text-[#8c716c]'}>
                                            {style.icon}
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${notice.priority === 'urgente' ? 'bg-white/20' : 'bg-black/5'}`}>
                                                {notice.priority} • {notice.type.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <h4 className="text-sm font-black leading-tight line-clamp-1">{notice.title}</h4>
                                        <p className="text-xs leading-tight opacity-90 line-clamp-2">
                                            {notice.message}
                                        </p>
                                    </div>
                                </div>
                                {notices.length > 1 && (
                                    <div className="absolute bottom-2 right-5 text-[8px] font-black opacity-30 uppercase tracking-widest">
                                        {idx + 1} / {notices.length}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* ANIVERSÁRIOS - SEPARADOS */}
            {renderBirthdaySection()}

            {/* AVISOS - SEPARADOS COM PEEK */}
            {renderNoticesSection()}

            {/* BIRTHDAY FULL LIST DRAWER */}
            {isBirthdayDrawerOpen && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm p-0 animate-in fade-in duration-300">
                    <div className="absolute inset-0" onClick={() => setIsBirthdayDrawerOpen(false)} />
                    <div className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500 max-h-[85vh] flex flex-col">
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 mb-2 shrink-0" />
                        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
                            <div>
                                <h3 className="text-xl font-black text-[#1b1c1a]">Vizinhança de Niver</h3>
                                <p className="text-[10px] font-bold text-[#8c716c] uppercase">Celebrando nossa equipe nesta semana</p>
                            </div>
                            <button onClick={() => setIsBirthdayDrawerOpen(false)} className="p-3 bg-gray-50 rounded-full text-gray-400"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-10">
                            {sortedBirthdays.map((b) => {
                                const [d, m] = b.date.split('/')
                                const label = monthNames[parseInt(m) - 1]
                                const isToday = parseInt(d) === new Date().getDate() && parseInt(m) === new Date().getMonth() + 1
                                return (
                                    <div key={b.id} className={`p-4 rounded-3xl flex items-center gap-4 border transition-all ${isToday ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
                                        <div className="w-12 h-12 rounded-2xl bg-white flex flex-col items-center justify-center shadow-sm border border-gray-100">
                                            <span className="text-[8px] font-extrabold text-[#B13A2B] leading-none mb-0.5">{label}</span>
                                            <span className="text-lg font-black text-[#1b1c1a] leading-none">{d}</span>
                                        </div>
                                        <div className="w-12 h-12 rounded-full bg-white shadow-sm overflow-hidden flex items-center justify-center shrink-0">
                                            {b.avatarUrl ? <img src={b.avatarUrl} className="w-full h-full object-cover" alt="Avatar" /> : <Cake className="w-5 h-5 text-gray-200" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-black text-[#1b1c1a] truncate">{b.name}</h4>
                                            {isToday && <span className="text-[9px] font-black text-indigo-600 uppercase flex items-center gap-1"><Sparkles className="w-3 h-3" /> É Hoje! Parabéns!</span>}
                                        </div>
                                        <Gift className={`w-5 h-5 ${isToday ? 'text-indigo-400' : 'text-gray-200'}`} />
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
