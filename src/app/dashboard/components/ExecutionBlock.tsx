'use client'

import React from 'react'
import { ClipboardList, ListChecks, Zap, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface Props {
    routinesCount: number
    onReportLoss: () => void
}

export default function ExecutionBlock({ routinesCount, onReportLoss }: Props) {
    return (
        <section className="animate-in fade-in slide-in-from-bottom-3 duration-700 delay-150">
            <header className="flex items-center justify-between mb-3.5 px-1">
                <p className="text-[10px] font-black text-[#8c716c] uppercase tracking-widest">O que fazer agora</p>
                <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            </header>
            
            <div className="space-y-3">
                {/* PRIMARY ACTIONS: CONTAGEM & CHECKLIST */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Contagem */}
                    <Link 
                        href="/dashboard/routines"
                        className="relative overflow-hidden bg-white rounded-3xl p-5 border border-[#e9e8e5] flex flex-col items-start gap-4 active:scale-[0.96] transition-all group shadow-sm hover:shadow-md"
                    >
                        {/* Status Light */}
                        <div className={`absolute top-0 right-0 w-12 h-12 -mr-4 -mt-4 opacity-5 blur-2xl rounded-full ${routinesCount > 0 ? 'bg-[#B13A2B]' : 'bg-green-500'}`} />
                        
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                            routinesCount > 0 
                                ? 'bg-[#B13A2B]/10 text-[#B13A2B] group-hover:bg-[#B13A2B] group-hover:text-white' 
                                : 'bg-gray-50 text-gray-400 group-hover:bg-gray-100 group-hover:text-gray-900'
                        }`}>
                            <ClipboardList className="w-6 h-6" />
                        </div>
                        
                        <div className="space-y-0.5">
                            <h4 className="text-sm font-black text-[#1b1c1a] tracking-tight">Contagem</h4>
                            {routinesCount > 0 ? (
                                <div className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#B13A2B]" />
                                    <p className="text-[10px] font-black text-[#B13A2B] uppercase tracking-tight">{routinesCount} pendente{routinesCount > 1 ? 's' : ''}</p>
                                </div>
                            ) : (
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Tudo em dia</p>
                            )}
                        </div>
                    </Link>

                    {/* Checklist */}
                    <Link 
                        href="/dashboard/checklist"
                        className="relative overflow-hidden bg-white rounded-3xl p-5 border border-[#e9e8e5] flex flex-col items-start gap-4 active:scale-[0.96] transition-all group shadow-sm hover:shadow-md"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#2b58b1] group-hover:text-white transition-all duration-500">
                            <ListChecks className="w-6 h-6" />
                        </div>
                        <div className="space-y-0.5">
                            <h4 className="text-sm font-black text-[#1b1c1a] tracking-tight">Checklist</h4>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Manual Operacional</p>
                        </div>
                    </Link>
                </div>

                {/* SECONDARY ACTION: RELATAR PERDA */}
                <button 
                    onClick={onReportLoss}
                    className="w-full bg-[#1b1c1a] rounded-[1.5rem] p-4 flex items-center justify-between active:scale-[0.98] transition-all group shadow-lg shadow-black/5"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                            <Zap className="w-4 h-4 fill-current" />
                        </div>
                        <div className="text-left">
                            <p className="text-xs font-black text-white tracking-tight">Relatar Perda</p>
                            <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Desperdício ou Avaria</p>
                        </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </button>
            </div>
        </section>
    )
}
