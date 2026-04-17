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
        <section>
            <p className="text-[10px] font-black text-[#8c716c] uppercase tracking-widest mb-3 px-1">O que fazer agora</p>
            <div className="grid grid-cols-3 gap-2.5">
                {/* Contagem */}
                <Link 
                    href="/dashboard/routines"
                    className="bg-white rounded-2xl p-4 border border-[#e9e8e5] flex flex-col items-center gap-2.5 active:scale-[0.96] transition-all text-center group"
                >
                    <div className="w-11 h-11 rounded-xl bg-[#FDF0EF] flex items-center justify-center text-[#B13A2B] group-hover:bg-[#B13A2B] group-hover:text-white transition-colors">
                        <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-[#1b1c1a] leading-tight">Contagem</p>
                        {routinesCount > 0 && (
                            <p className="text-[9px] font-bold text-[#B13A2B] mt-0.5">{routinesCount} pendente{routinesCount > 1 ? 's' : ''}</p>
                        )}
                    </div>
                </Link>

                {/* Checklist */}
                <Link 
                    href="/dashboard/checklist"
                    className="bg-white rounded-2xl p-4 border border-[#e9e8e5] flex flex-col items-center gap-2.5 active:scale-[0.96] transition-all text-center group"
                >
                    <div className="w-11 h-11 rounded-xl bg-[#F0F4FD] flex items-center justify-center text-[#2b58b1] group-hover:bg-[#2b58b1] group-hover:text-white transition-colors">
                        <ListChecks className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-[#1b1c1a] leading-tight">Checklist</p>
                </Link>

                {/* Relatar Perda */}
                <button 
                    onClick={onReportLoss}
                    className="bg-[#1b1c1a] rounded-2xl p-4 flex flex-col items-center gap-2.5 active:scale-[0.96] transition-all text-center cursor-pointer group"
                >
                    <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-400 group-hover:text-[#1b1c1a] transition-colors">
                        <Zap className="w-5 h-5 fill-current" />
                    </div>
                    <p className="text-xs font-bold text-white leading-tight">Relatar Perda</p>
                </button>
            </div>
        </section>
    )
}
