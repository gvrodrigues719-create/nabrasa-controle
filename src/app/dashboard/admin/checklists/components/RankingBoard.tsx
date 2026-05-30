"use client"

import { useState, useEffect } from 'react'
import { getMonthlyRankingAction } from '@/app/actions/gamificationAction'
import { Trophy, Medal, Target, Star, Loader2, ArrowUpRight } from 'lucide-react'

export default function RankingBoard() {
    const [ranking, setRanking] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            const res = await getMonthlyRankingAction()
            if (res.success) {
                setRanking(res.ranking || [])
            }
            setLoading(false)
        }
        fetchData()
    }, [])

    if (loading) return (
        <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#B13A2B] animate-spin" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4">Compilando Score de Elite...</p>
        </div>
    )

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* TOP 3 PODIUM */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                {ranking.slice(0, 3).map((player, idx) => (
                    <div 
                        key={player.userId}
                        className={`relative p-8 rounded-[40px] border-2 flex flex-col items-center justify-center text-center overflow-hidden h-fit transition-all hover:scale-[1.02] ${
                            idx === 0 ? 'bg-gray-900 border-gray-900 shadow-2xl' : 
                            idx === 1 ? 'bg-white border-gray-200' : 'bg-white border-gray-100'
                        }`}
                    >
                        {idx === 0 && <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />}
                        
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-sm ${
                            idx === 0 ? 'bg-white' : 'bg-gray-100'
                        }`}>
                            {idx === 0 ? <Trophy className="w-8 h-8 text-amber-500" /> : <Medal className={`w-8 h-8 ${idx === 1 ? 'text-gray-400' : 'text-amber-700'}`} />}
                        </div>

                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${idx === 0 ? 'text-white/40' : 'text-gray-400'}`}>
                            {idx === 0 ? 'Elite Operacional' : `Top ${idx + 1}`}
                        </p>
                        <h4 className={`text-xl font-black mb-4 ${idx === 0 ? 'text-white' : 'text-gray-900'}`}>{player.name}</h4>
                        
                        <div className="grid grid-cols-2 gap-4 w-full pt-4 border-t border-dashed border-gray-200">
                            <div>
                                <p className={`text-[8px] font-black uppercase tracking-widest ${idx === 0 ? 'text-white/30' : 'text-gray-300'}`}>Score</p>
                                <p className={`text-lg font-black ${idx === 0 ? 'text-[#B13A2B]' : 'text-gray-900'}`}>{Math.round(player.score)}%</p>
                            </div>
                            <div>
                                <p className={`text-[8px] font-black uppercase tracking-widest ${idx === 0 ? 'text-white/30' : 'text-gray-300'}`}>Pontos</p>
                                <p className={`text-lg font-black ${idx === 0 ? 'text-white' : 'text-gray-900'}`}>{player.points}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* FULL LIST */}
            <div className="bg-white rounded-[40px] border border-gray-200 shadow-sm p-8 flex flex-col h-full">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-500" />
                        Lista Completa
                    </h3>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full">{ranking.length} Operadores</span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-2 scrollbar-thin scrollbar-thumb-gray-100 scrollbar-track-transparent">
                    {ranking.map((r, idx) => (
                        <div 
                            key={r.userId}
                            className={`flex items-center justify-between p-4 rounded-3xl border transition-all hover:bg-gray-50 ${
                                idx < 3 ? 'bg-gray-50/50 border-gray-100' : 'bg-white border-transparent'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black border ${
                                    idx === 0 ? 'bg-amber-50 border-amber-200 text-amber-600' :
                                    idx === 1 ? 'bg-gray-50 border-gray-200 text-gray-500' :
                                    'bg-white border-gray-100 text-gray-300'
                                }`}>
                                    {idx + 1}
                                </span>
                                <div>
                                    <p className="text-[11px] font-black text-gray-900 uppercase tracking-tight">{r.name}</p>
                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Conserto & Domínio</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-black text-[#B13A2B]">{Math.round(r.score)}%</p>
                                <p className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">{r.points} pts</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 p-6 bg-gray-900 rounded-[32px] text-white overflow-hidden relative group cursor-pointer">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-125" />
                    <div className="relative flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Incentivo do Mês</p>
                            <h4 className="text-sm font-black italic">Trilha de Domínio Ativa</h4>
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-white/20" />
                    </div>
                </div>
            </div>
        </div>
    )
}
