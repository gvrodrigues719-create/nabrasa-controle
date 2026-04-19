'use client'

import React from 'react'
import { MapPin, AlertCircle, ArrowRight, Clock, CheckCircle2 } from 'lucide-react'

interface Props {
    stats: {
        name: string
        pendingCount: number
        delayCount: number
        nextActionLabel: string
    } | null
}

export default function MyAreaTodayCard({ stats }: Props) {
    if (!stats) return null

    const hasCriticalDelay = stats.delayCount > 0

    return (
        <div className="bg-white rounded-[2.5rem] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.04)] border border-[#e9e8e5] flex flex-col gap-6">
            {/* Header: Área e Identificação */}
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#F8F7F4] flex items-center justify-center text-[#8c716c] shadow-sm border border-[#eeedea]">
                        <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black text-[#8c716c] uppercase tracking-[0.2em] leading-none mb-1">Sua área hoje</h3>
                        <p className="text-lg font-black text-[#1b1c1a] leading-none tracking-tight">{stats.name}</p>
                    </div>
                </div>
                {stats.pendingCount === 0 && !hasCriticalDelay && (
                    <div className="bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-tight">Em dia</span>
                    </div>
                )}
            </header>

            {/* Grid de Estado Operacional */}
            <div className="grid grid-cols-2 gap-4">
                {/* Pendências */}
                <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-black text-[#c0b3b1] uppercase tracking-[0.15em] ml-1">Pendências</span>
                    <div className={`p-4 rounded-3xl border flex items-center justify-between transition-all ${
                        stats.pendingCount > 0 
                            ? 'bg-[#FDF0EF]/50 border-red-100' 
                            : 'bg-[#F8F7F4] border-[#eeedea]'
                    }`}>
                        <div className="flex flex-col">
                            <span className={`text-2xl font-black tracking-tighter leading-none ${stats.pendingCount > 0 ? 'text-[#B13A2B]' : 'text-[#1b1c1a]'}`}>
                                {stats.pendingCount}
                            </span>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Rotinas</span>
                        </div>
                        {stats.pendingCount > 0 && <div className="w-2 h-2 rounded-full bg-[#B13A2B] animate-pulse" />}
                    </div>
                </div>

                {/* Atrasos */}
                <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-black text-[#c0b3b1] uppercase tracking-[0.15em] ml-1">Atrasos Críticos</span>
                    <div className={`p-4 rounded-3xl border flex items-center justify-between transition-all ${
                        hasCriticalDelay 
                            ? 'bg-red-50 border-red-200 shadow-sm shadow-red-100' 
                            : 'bg-[#F8F7F4] border-[#eeedea]'
                    }`}>
                        <div className="flex flex-col">
                            <span className={`text-2xl font-black tracking-tighter leading-none ${hasCriticalDelay ? 'text-red-700' : 'text-[#1b1c1a]'}`}>
                                {stats.delayCount}
                            </span>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Sessões</span>
                        </div>
                        {hasCriticalDelay ? (
                            <Clock className="w-5 h-5 text-red-500 animate-pulse" />
                        ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-40" />
                        )}
                    </div>
                </div>
            </div>

            {/* Footer: Próxima Ação Direcionada */}
            <div className="mt-2 p-5 rounded-3xl bg-[#1b1c1a] text-white flex items-center justify-between group cursor-pointer transition-all hover:bg-[#2a2b28]">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white/80">
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <div>
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] leading-none mb-1 block">Próxima ação recomendada</span>
                        <p className="text-[13px] font-black text-white leading-tight tracking-tight">{stats.nextActionLabel}</p>
                    </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#B13A2B]" />
                </div>
            </div>
        </div>
    )
}
