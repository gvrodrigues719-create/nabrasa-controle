'use client'

import React from 'react'
import { ClipboardList, ListChecks, Zap, ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { DashboardAction } from '../hooks/useDashboardData'

interface Props {
    routinesCount: number
    countsPending: number
    checklistsPending: number
    onReportLoss: () => void
    recommendedActions: DashboardAction[]
}

export default function ExecutionBlock({ routinesCount, countsPending, checklistsPending, onReportLoss, recommendedActions }: Props) {
    const topRecommended = recommendedActions[0]

    return (
        <section className="animate-in fade-in slide-in-from-bottom-3 duration-700 delay-150">
            <header className="flex items-center justify-between mb-3.5 px-1">
                <p className="text-[10px] font-black text-[#8c716c] uppercase tracking-widest">Ação Prioritária</p>
                <Link href="/dashboard/routines?returnTo=/dashboard" className="text-[10px] font-black text-[#B13A2B] uppercase tracking-tight flex items-center gap-1 group">
                    Ver todas <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>
            </header>
            
            <div className="space-y-3">
                {/* DYNAMIC RECOMMENDATION */}
                {topRecommended && (
                    <Link 
                        href={topRecommended.url}
                        className="block relative overflow-hidden bg-white rounded-[2rem] p-5 border-2 border-[#1b1c1a]/5 flex items-center gap-5 active:scale-[0.98] transition-all group shadow-md"
                    >
                        <div className="relative w-14 h-14 rounded-2xl bg-[#1b1c1a] flex items-center justify-center text-white shrink-0 shadow-lg shadow-black/10">
                            <Zap className="w-7 h-7 fill-amber-400 text-amber-400" />
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#B13A2B] rounded-full border-2 border-white animate-pulse" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <span className="text-[9px] font-black text-[#B13A2B] uppercase tracking-[0.2em] mb-1 block">Próxima na Fila</span>
                            <h4 className="text-[15px] font-black text-[#1b1c1a] truncate leading-tight">{topRecommended.label}</h4>
                            <p className="text-[10px] font-bold text-gray-400 mt-0.5">{topRecommended.description}</p>
                        </div>
                        
                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-[#1b1c1a] group-hover:text-white transition-all">
                            <ArrowRight className="w-5 h-5" />
                        </div>
                    </Link>
                )}

                {/* UNIFIED PRIMARY ACTION: TAREFAS DO TURNO */}
                <Link 
                    href="/dashboard/routines?returnTo=/dashboard"
                    className="relative overflow-hidden bg-white rounded-[2rem] p-6 border border-[#e9e8e5] flex items-center gap-5 active:scale-[0.98] transition-all group shadow-sm hover:shadow-md"
                >
                    {/* Status Light */}
                    <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-5 blur-3xl rounded-full ${routinesCount > 0 ? 'bg-[#B13A2B]' : 'bg-green-500'}`} />
                    
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                        routinesCount > 0 
                            ? 'bg-[#B13A2B]/10 text-[#B13A2B] group-hover:bg-[#B13A2B] group-hover:text-white' 
                            : 'bg-green-50 text-green-600'
                    }`}>
                        <ClipboardList className="w-7 h-7" />
                    </div>
                    
                    <div className="flex-1">
                        <h4 className="text-base font-black text-[#1b1c1a] tracking-tight">Tarefas do Turno</h4>
                        <div className="flex flex-col mt-0.5">
                            <span className="text-[11px] font-black text-[#B13A2B] uppercase tracking-tight">
                                {routinesCount} pendência{routinesCount !== 1 ? 's' : ''} hoje
                            </span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                {countsPending} contagem{countsPending !== 1 ? 's' : ''} • {checklistsPending} checklist{checklistsPending !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>

                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-[#1b1c1a] group-hover:text-white transition-all">
                        <ArrowRight className="w-5 h-5" />
                    </div>
                </Link>

                {/* SECONDARY ACTION: RELATAR PERDA */}
                <button 
                    onClick={onReportLoss}
                    className="w-full bg-[#1b1c1a] rounded-[1.5rem] p-4.5 flex items-center justify-between active:scale-[0.98] transition-all group shadow-lg shadow-black/5 min-h-[64px]"
                >
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                            <Zap className="w-5 h-5 fill-current" />
                        </div>
                        <div className="text-left">
                            <p className="text-[13px] font-black text-white tracking-tight">Relatar Perda</p>
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.1em]">Desperdício ou Avaria</p>
                        </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </button>
            </div>
        </section>
    )
}
