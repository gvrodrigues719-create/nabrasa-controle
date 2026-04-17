'use client'

import React from 'react'
import { Star, Trophy, ShieldCheck, Gift, ChevronRight } from 'lucide-react'

interface Props {
    weeklyPoints: number
    totalPoints: number
    rankPosition: number | null
    lastSealing?: { reason: string; points: number; created_at: string } | null
    topRanking?: { name: string; points: number; rank: number }[]
    coinBalance: number
    onOpenRewards: () => void
}

export default function WeeklyProgressBar({
    weeklyPoints,
    totalPoints,
    rankPosition,
    lastSealing,
    topRanking,
    coinBalance,
    onOpenRewards,
}: Props) {
    const top3 = topRanking?.slice(0, 3) || []

    return (
        <div className="bg-white rounded-[24px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#e9e8e5]">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <Star className="w-3.5 h-3.5 text-[#8c716c]" />
                <span className="text-[10px] font-black text-[#8c716c] uppercase tracking-widest">Minha Semana</span>
            </div>

            {/* Métricas em linha */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                    <p className="text-[9px] font-bold text-[#c0b3b1] uppercase tracking-widest mb-0.5">Pontos</p>
                    <div className="flex items-baseline gap-0.5">
                        <span className="text-2xl font-black text-[#1b1c1a] tracking-tighter">{weeklyPoints}</span>
                        <span className="text-[9px] font-bold text-[#B13A2B]">PTS</span>
                    </div>
                </div>
                <div className="border-l border-[#eeedea] pl-3">
                    <p className="text-[9px] font-bold text-[#c0b3b1] uppercase tracking-widest mb-0.5">Ranking</p>
                    <div className="flex items-baseline gap-1">
                        {rankPosition && weeklyPoints > 0 ? (
                            <>
                                <span className="text-2xl font-black text-[#1b1c1a] tracking-tighter">#{rankPosition}</span>
                            </>
                        ) : (
                            <span className="text-sm font-bold text-[#c0b3b1]">—</span>
                        )}
                    </div>
                </div>
                <div className="border-l border-[#eeedea] pl-3">
                    <p className="text-[9px] font-bold text-[#c0b3b1] uppercase tracking-widest mb-0.5">Moedas</p>
                    <div className="flex items-baseline gap-0.5">
                        <span className="text-2xl font-black text-amber-600 tracking-tighter">{coinBalance}</span>
                        <span className="text-[9px] font-bold text-amber-500">NB</span>
                    </div>
                </div>
            </div>

            {/* Top 3 compacto */}
            {top3.length > 0 && (
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F8F7F4] border border-[#eeedea] mb-3">
                    <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <div className="flex-1 flex items-center gap-3 text-[10px] overflow-hidden">
                        {top3.map((item, i) => (
                            <span key={i} className="flex items-center gap-1 whitespace-nowrap">
                                <span className={`font-black ${i === 0 ? 'text-amber-600' : 'text-[#c0b3b1]'}`}>{item.rank}.</span>
                                <span className="font-bold text-[#1b1c1a]">{item.name}</span>
                                <span className="font-bold text-[#c0b3b1]">{item.points}</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Última vedação */}
            {lastSealing && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100/50 mb-3">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <p className="text-[10px] font-bold text-[#1b1c1a] truncate max-w-[200px]">{lastSealing.reason}</p>
                    </div>
                    <span className="text-[9px] font-black text-emerald-700 whitespace-nowrap">+{lastSealing.points}</span>
                </div>
            )}

            {/* Botão de Recompensas integrado */}
            <button
                onClick={onOpenRewards}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#1b1c1a] text-white active:scale-[0.98] transition-all cursor-pointer group"
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                        <Gift className="w-4 h-4 text-[#1b1c1a]" />
                    </div>
                    <div className="text-left">
                        <p className="text-[11px] font-bold text-white/90">Recompensas</p>
                        <p className="text-[9px] font-medium text-white/40">Resgatar benefícios</p>
                    </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
            </button>
        </div>
    )
}
