'use client'

import React from 'react'
import { Star, Trophy, ShieldCheck, Zap } from 'lucide-react'

interface Props {
    weeklyPoints: number
    totalPoints: number
    rankPosition: number | null
    lastSealing?: {
        reason: string
        points: number
        created_at: string
    } | null
    topRanking?: { name: string, points: number, rank: number }[]
}

export default function OperatorContributionCard({ weeklyPoints, totalPoints, rankPosition, lastSealing, topRanking }: Props) {
    return (
        <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#e9e8e5] relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-[#8c716c]">
                    <Star className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Minha Contribuição</span>
                </div>
                {rankPosition && weeklyPoints > 0 && (
                     <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-100 px-3 py-1 rounded-full">
                        <Trophy className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-tight">#{rankPosition} RANKING</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div>
                    <p className="text-[10px] font-bold text-[#8c716c] uppercase tracking-widest mb-1">Pontos na Semana</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-[#1b1c1a] tracking-tighter">{weeklyPoints}</span>
                        <span className="text-xs font-bold text-[#B13A2B]">PTS</span>
                    </div>
                </div>
                <div className="border-l border-[#eeedea] pl-4">
                    <p className="text-[10px] font-bold text-[#8c716c] uppercase tracking-widest mb-1">Total Acumulado</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-[#58413e] tracking-tight">{totalPoints}</span>
                    </div>
                </div>
            </div>

            {/* RANKING SEMANAL (MOCK / REAL) */}
            {topRanking && topRanking.length > 0 && (
                <div className="mb-8 pt-6 border-t border-dashed border-[#eeedea]">
                    <div className="flex items-center gap-2 mb-4">
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-[9px] font-black text-[#8c716c] uppercase tracking-widest">Destaques da Semana</span>
                    </div>
                    <div className="space-y-2">
                        {topRanking.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-3">
                                    <span className={`w-4 text-[10px] font-black ${idx === 0 ? 'text-amber-500' : 'text-[#c0b3b1]'}`}>
                                        {item.rank}
                                    </span>
                                    <span className="font-bold text-[#1b1c1a]">{item.name}</span>
                                </div>
                                <span className="text-[10px] font-black text-[#58413e]">{item.points} PTS</span>
                            </div>
                        ))}
                        {topRanking.length > 3 && (
                            <div className="pt-1 text-center">
                                <p className="text-[9px] font-bold text-[#c0b3b1] uppercase tracking-widest">Ver ranking completo</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ÚLTIMO DESTAQUE / VEDAÇÃO */}
            <div className="pt-6 border-t border-dashed border-[#eeedea]">
                <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[9px] font-black text-[#8c716c] uppercase tracking-widest">Último Destaque</span>
                </div>
                
                {lastSealing ? (
                    <div className="flex items-center justify-between bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/50">
                        <p className="text-[11px] font-bold text-[#1b1c1a] max-w-[70%] leading-tight">
                            {lastSealing.reason}
                        </p>
                        <span className="text-[10px] font-black text-emerald-700">+{lastSealing.points} PTS</span>
                    </div>
                ) : (
                    <div className="bg-[#F8F7F4] p-3 rounded-xl border border-dashed border-[#eeedea]">
                        <p className="text-[11px] font-medium text-[#c0b3b1] italic">
                            Sua próxima vedação aparecerá aqui.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
