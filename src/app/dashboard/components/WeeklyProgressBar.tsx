'use client'

import React from 'react'
import { TrendingUp, Trophy, ShieldCheck, Gift, ChevronRight } from 'lucide-react'

interface Props {
    weeklyPoints: number
    totalPoints: number
    rankPosition: number | null
    lastSealing?: { reason: string; points: number; created_at: string } | null
    topRanking?: { name: string; points: number; rank: number }[]
    coinBalance: number
    onOpenRewards: () => void
    isManagerView?: boolean
    showTop3Recognition?: boolean
    showFullTeamRanking?: boolean
}

export default function WeeklyProgressBar({
    weeklyPoints,
    totalPoints,
    rankPosition,
    lastSealing,
    topRanking,
    coinBalance,
    onOpenRewards,
    isManagerView = false,
    showTop3Recognition = true,
    showFullTeamRanking = false,
}: Props) {
    // POLÍTICA: Operador vê apenas Top 3. Manager vê o que estiver disponível (geralmente Full).
    const displayRanking = isManagerView && showFullTeamRanking 
        ? topRanking 
        : topRanking?.slice(0, 3) || []

    const hasRanking = displayRanking && displayRanking.length > 0
 
    return (
        <div className="bg-[#f4faf4] rounded-[2.5rem] p-6 shadow-sm border border-[#e6f2e6] flex flex-col gap-6 animate-in fade-in duration-700">
            {/* Header: Contexto de Evolução */}
            <header className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[#8c716c]">
                        <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black text-[#1b1c1a] uppercase tracking-[0.2em] leading-none mb-1">Minha Evolução</h3>
                        <p className="text-[8px] font-bold text-[#c0b3b1] uppercase tracking-widest leading-none">Progresso Semanal</p>
                    </div>
                </div>
                {weeklyPoints > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black text-emerald-700 uppercase tracking-tight">Em Crescimento</span>
                    </div>
                )}
            </header>

            {/* Métricas Operacionais - Cards Sóbrios */}
            <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-3xl bg-[#F8F7F4] border border-[#eeedea] transition-all hover:border-[#8c716c]/20">
                    <p className="text-[9px] font-black text-[#8c716c] uppercase tracking-[0.15em] mb-2">Pontos Acumulados</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-[#1b1c1a] tracking-tighter">{weeklyPoints}</span>
                        <span className="text-[10px] font-black text-[#B13A2B] uppercase">Pts</span>
                    </div>
                </div>
                <div className="p-4 rounded-3xl bg-[#F8F7F4] border border-[#eeedea] transition-all hover:border-[#8c716c]/20">
                    <p className="text-[9px] font-black text-[#8c716c] uppercase tracking-[0.15em] mb-2">Saldo de Créditos</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-amber-600 tracking-tighter">{coinBalance}</span>
                        <span className="text-[10px] font-black text-amber-500 uppercase">Cr</span>
                    </div>
                </div>
            </div>

            {/* Ranking: Reconhecimento Positivo da Unidade */}
            {showTop3Recognition && hasRanking && (
                <div className="space-y-3">
                    <header className="flex items-center justify-between px-1">
                        <h4 className="text-[9px] font-black text-[#8c716c] uppercase tracking-[0.15em] flex items-center gap-2">
                            <Trophy className="w-3.5 h-3.5 text-amber-500" /> 
                            {isManagerView ? 'Ranking da Equipe' : 'Destaque e Reconhecimento'}
                        </h4>
                        {rankPosition && (
                            <span className="text-[9px] font-black text-[#1b1c1a]/40 bg-gray-50 px-2 py-0.5 rounded-md uppercase tracking-tight">
                                Minha Posição: {rankPosition}º
                            </span>
                        )}
                    </header>
                    <div className="bg-white rounded-3xl border border-[#eeedea] overflow-hidden divide-y divide-gray-50 shadow-sm">
                        {displayRanking.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3.5 hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${
                                        idx === 0 ? 'bg-amber-100 text-amber-700' :
                                        idx === 1 ? 'bg-gray-100 text-gray-700' :
                                        idx === 2 ? 'bg-orange-50 text-orange-700' :
                                        'bg-gray-50/50 text-[#c0b3b1]'
                                    }`}>
                                        {idx + 1}º
                                    </div>
                                    <span className="text-xs font-black text-[#1b1c1a]">{item.name}</span>
                                </div>
                                <div className="flex items-baseline gap-0.5 opacity-60">
                                    <span className="text-[11px] font-black text-[#1b1c1a]">{item.points}</span>
                                    <span className="text-[8px] font-bold text-[#8c716c] uppercase">Pts</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Reconhecimento Profissional */}
            {lastSealing && (
                <div className="p-4 rounded-3xl bg-emerald-50/40 border border-emerald-100/50 flex items-center justify-between transition-all hover:bg-emerald-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center border border-emerald-100 shadow-sm">
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest leading-none mb-1">Mérito Profissional</span>
                            <p className="text-[11px] font-bold text-[#1b1c1a] leading-tight line-clamp-1 max-w-[150px]">{lastSealing.reason}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-sm font-black text-emerald-700">+{lastSealing.points}</span>
                        <p className="text-[8px] font-bold text-emerald-600/60 uppercase leading-none mt-0.5">Pontos</p>
                    </div>
                </div>
            )}

            {/* Portal de Benefícios e Méritos */}
            <button
                onClick={onOpenRewards}
                className="group w-full relative overflow-hidden rounded-[1.75rem] bg-[#1b1c1a] p-1 pr-4 active:scale-[0.98] transition-all cursor-pointer"
            >
                {/* Visual Glass Edge */}
                <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 bg-white/5 blur-3xl rounded-full" />
                
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-white transition-all duration-500 group-hover:scale-110">
                            <Gift className="w-5 h-5" />
                        </div>
                        <div className="text-left py-2">
                            <p className="text-[12px] font-black text-white tracking-tight">Benefícios e Méritos</p>
                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Acesse seu saldo de créditos</p>
                        </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                        <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white transition-all group-hover:translate-x-0.5" />
                    </div>
                </div>
            </button>
        </div>
    )
}
