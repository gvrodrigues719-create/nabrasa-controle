'use client'

import React from 'react'
import { Sparkles, ArrowRight } from 'lucide-react'

interface Props {
    onClick: () => void
}

export default function OperationAI({ onClick }: Props) {
    return (
        <button 
            onClick={onClick}
            className="w-full bg-gradient-to-br from-[#1b1c1a] to-[#333] rounded-[32px] p-6 shadow-xl relative overflow-hidden group text-left active:scale-[0.99] transition-all"
        >
            {/* Efeito Glow sutil */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/10 blur-[60px] rounded-full -mr-24 -mt-24 pointer-events-none" />
            
            <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-amber-400">
                        <Sparkles className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg leading-tight">Ajuda da Operação</h3>
                        <p className="text-sm text-white/50 mt-0.5 font-medium">Tire dúvidas sobre estoque, perdas e organização</p>
                    </div>
                </div>
                <div className="bg-white/10 p-2 rounded-xl text-white/60 group-hover:text-white transition-colors">
                    <ArrowRight className="w-5 h-5" />
                </div>
            </div>
            
            <div className="mt-4 flex gap-2 overflow-hidden opacity-30 group-hover:opacity-50 transition-opacity">
                <span className="text-[10px] font-bold text-white uppercase tracking-widest whitespace-nowrap bg-white/10 px-2 py-0.5 rounded-full border border-white/10">Estoque</span>
                <span className="text-[10px] font-bold text-white uppercase tracking-widest whitespace-nowrap bg-white/10 px-2 py-0.5 rounded-full border border-white/10">Validade</span>
                <span className="text-[10px] font-bold text-white uppercase tracking-widest whitespace-nowrap bg-white/10 px-2 py-0.5 rounded-full border border-white/10">CMV</span>
            </div>
        </button>
    )
}
