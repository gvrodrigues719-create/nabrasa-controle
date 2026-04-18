'use client'

import React, { useState } from 'react'
import { AlertOctagon, Info, Bell, ChevronRight, ChevronLeft, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Cake, Gift, Sparkles } from 'lucide-react'

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
    name: string
    date: string
    avatarUrl?: string
}

interface Props {
    notices: Notice[]
    birthdays?: Birthday[]
}

export default function OperationalNoticeCard({ notices, birthdays = [] }: Props) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isListOpen, setIsListOpen] = useState(false)

    if ((!notices || notices.length === 0) && (!birthdays || birthdays.length === 0)) return null

    const totalSlides = notices.length + (birthdays && birthdays.length > 0 ? 1 : 0)
    const isBirthdaySlide = currentIndex >= notices.length
    const hasMultiple = totalSlides > 1

    const nextNotice = () => setCurrentIndex((prev) => (prev + 1) % totalSlides)
    const prevNotice = () => setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides)
    
    // Slide de Aniversariantes
    if (isBirthdaySlide && birthdays && birthdays.length > 0) {
        return (
            <section className="relative">
                <div className="flex items-center justify-between mb-3 px-1">
                    <p className="text-[10px] font-black text-[#8c716c] uppercase tracking-widest">Mural da Casa</p>
                </div>

                <div className="relative overflow-hidden rounded-[2.5rem] border border-[#e9e8e5] shadow-sm transition-all duration-300 bg-white text-[#1b1c1a]">
                    <div className="p-6 flex items-center gap-5">
                        {/* CALENDAR BADGE - DESTAQUE NO DIA */}
                        <div className="flex flex-col items-center justify-center w-14 h-16 bg-[#B13A2B] rounded-2xl shadow-lg shadow-red-100 shrink-0">
                            <span className="text-[8px] font-black text-white/70 uppercase leading-none mb-1">MES {birthdays[0].date.split('/')[1]}</span>
                            <span className="text-2xl font-black text-white leading-none">{birthdays[0].date.split('/')[0]}</span>
                        </div>

                        <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                                 <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    ANIVERSARIANTES DA SEMANA
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-3 pt-1">
                                {/* AVATAR DO ANIVERSARIANTE */}
                                <div className="w-10 h-10 rounded-full bg-indigo-50 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center shrink-0">
                                    {birthdays[0].avatarUrl ? (
                                        <img src={birthdays[0].avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
                                    ) : (
                                        <Cake className="w-5 h-5 text-indigo-200" />
                                    )}
                                </div>
                                <div className="leading-tight">
                                    <h4 className="text-base font-black tracking-tight">{birthdays[0].name}</h4>
                                    <p className="text-[10px] text-[#8c716c] font-bold">Parabéns pela dedicação!</p>
                                </div>
                            </div>

                            {birthdays.length > 1 && (
                                <div className="mt-2 flex -space-x-2">
                                    {birthdays.slice(1).map(b => (
                                        <div key={b.id} className="w-6 h-6 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center overflow-hidden">
                                            {b.avatarUrl ? (
                                                <img src={b.avatarUrl} className="w-full h-full object-cover" alt="Other" />
                                            ) : (
                                                <span className="text-[8px] font-black text-indigo-400">{b.name.charAt(0)}</span>
                                            )}
                                        </div>
                                    ))}
                                    <span className="pl-4 text-[9px] font-bold text-indigo-400 flex items-center">+{birthdays.length - 1} outros na semana</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {hasMultiple && (
                        <div className="flex items-center justify-between border-t border-gray-50 px-3 py-2 bg-gray-50/50">
                            <button onClick={prevNotice} className="p-1 hover:bg-white rounded-lg transition-colors">
                                <ChevronLeft className="w-4 h-4 text-gray-400" />
                            </button>
                            <span className="text-[8px] font-black uppercase tracking-widest opacity-60 text-gray-400">
                                Mural {currentIndex + 1} de {totalSlides}
                            </span>
                            <button onClick={nextNotice} className="p-1 hover:bg-white rounded-lg transition-colors">
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                    )}
                </div>
            </section>
        )
    }

    // Se no  slide de aniversrio, calculamos os dados do aviso atual
    const current = notices[currentIndex]
    if (!current) return null // Fallback de segurana

    const priorityStyles = {
        urgente: {
            bg: 'bg-[#B13A2B]',
            text: 'text-white',
            tag: 'bg-white/20 text-white',
            icon: <AlertOctagon className="w-5 h-5" />
        },
        importante: {
            bg: 'bg-[#EAB308]',
            text: 'text-[#1b1c1a]',
            tag: 'bg-black/10 text-[#1b1c1a]',
            icon: <Info className="w-5 h-5" />
        },
        normal: {
            bg: 'bg-white',
            text: 'text-[#1b1c1a]',
            tag: 'bg-[#F8F7F4] text-[#8c716c]',
            icon: <Bell className="w-5 h-5" />
        }
    }

    const style = priorityStyles[current.priority] || priorityStyles.normal


    return (
        <section className="relative">
            <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-[10px] font-black text-[#8c716c] uppercase tracking-widest">Avisos da Casa</p>
                {hasMultiple && (
                    <button 
                        onClick={() => setIsListOpen(true)}
                        className="text-[10px] font-black text-[#B13A2B] uppercase tracking-widest hover:underline"
                    >
                        Ver todos ({notices.length})
                    </button>
                )}
            </div>

            <div className={`relative overflow-hidden rounded-[2rem] border border-[#e9e8e5] shadow-sm transition-all duration-300 ${style.bg} ${style.text}`}>
                <div className="p-5 flex gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${current.priority === 'urgente' ? 'bg-white/10' : 'bg-[#F8F7F4]'}`}>
                        <div className={current.priority === 'urgente' ? 'text-white' : 'text-[#8c716c]'}>
                            {style.icon}
                        </div>
                    </div>

                    <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                             <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${style.tag}`}>
                                {current.priority} • {current.type.replace('_', ' ')}
                            </span>
                        </div>
                        <h4 className="text-sm font-black leading-tight">{current.title}</h4>
                        <p className={`text-xs leading-relaxed opacity-90 line-clamp-2`}>
                            {current.message}
                        </p>

                        <div className="pt-2 flex items-center gap-2 opacity-60 text-[9px] font-bold uppercase tracking-wider">
                            <span>{current.users?.name || 'Sistema'}</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(current.created_at), { addSuffix: true, locale: ptBR })}</span>
                        </div>
                    </div>
                </div>

                {hasMultiple && (
                    <div className="flex items-center justify-between border-t border-black/5 px-3 py-2 bg-black/5">
                        <button onClick={prevNotice} className="p-1 hover:bg-black/5 rounded-lg transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                Aviso {currentIndex + 1} de {totalSlides}
                        </span>
                        <button onClick={nextNotice} className="p-1 hover:bg-black/5 rounded-lg transition-colors">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* List Drawer (Modal Simples para Prototipagem) */}
            {isListOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-[#F8F7F4] rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-500 max-h-[80vh] flex flex-col">
                        <div className="p-6 border-b border-[#e9e8e5] bg-white flex items-center justify-between">
                            <h3 className="text-sm font-black text-[#1b1c1a] uppercase tracking-tight">Todos os Avisos</h3>
                            <button onClick={() => setIsListOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-[#8c716c]" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {notices.map((notice, idx) => (
                                <div key={notice.id} className="p-4 bg-white rounded-2xl border border-[#e9e8e5] space-y-2">
                                     <div className="flex items-center gap-2">
                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-[#F8F7F4] text-[#8c716c]`}>
                                            {notice.priority}
                                        </span>
                                        <span className="text-[10px] font-bold text-[#c0b3b1] whitespace-nowrap">
                                            {formatDistanceToNow(new Date(notice.created_at), { addSuffix: true, locale: ptBR })}
                                        </span>
                                    </div>
                                    <h5 className="text-sm font-black text-[#1b1c1a]">{notice.title}</h5>
                                    <p className="text-xs text-[#58413e] leading-relaxed">{notice.message}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}
