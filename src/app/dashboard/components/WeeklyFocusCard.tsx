'use client'

import React from 'react'
import { Flame, ArrowUpRight } from 'lucide-react'

interface Props {
    focus?: string
}

export default function WeeklyFocusCard({ focus = 'Reduzir desperdício de insumos críticos e registrar perdas no momento certo.' }: Props) {
    return (
        <div className="bg-[#1b1c1a] rounded-[32px] p-6 shadow-xl relative overflow-hidden group">
            {/* Efeito visual de fundo sutil */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#B13A2B] to-transparent opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
            
            <div className="relative z-10">
                <div className="flex items-center gap-2 text-white/40 mb-3">
                    <Flame className="w-4 h-4 text-[#B13A2B] fill-[#B13A2B]" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Foco da Semana</span>
                </div>
                
                <h3 className="text-xl font-bold text-white leading-tight pr-4">
                    {focus}
                </h3>
                
                <div className="mt-4 inline-flex items-center gap-1.5 text-[9px] font-black text-[#B13A2B] uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded-full">
                    Prioridade Máxima
                    <ArrowUpRight className="w-3 h-3" />
                </div>
            </div>
        </div>
    )
}
