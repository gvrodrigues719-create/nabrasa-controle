'use client'

import React from 'react'
import { Gift, ChevronRight } from 'lucide-react'

interface Props {
    balance: number
    onClick: () => void
}

export default function RewardsWidget({ balance, onClick }: Props) {
    return (
        <button 
            onClick={onClick}
            className="w-full mt-6 bg-[#1b1c1a] text-white rounded-[32px] p-6 shadow-xl active:scale-[0.98] transition-all flex items-center justify-between group overflow-hidden relative cursor-pointer"
        >
            {/* Efeito de brilho sutíl */}
            <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-amber-500/0 via-amber-500/10 to-amber-500/0 transform -skew-x-[30deg] -translate-x-[150%] group-hover:animate-[shine_1.5s_ease-out]" />

            <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-inner">
                    <Gift className="w-6 h-6 text-[#1b1c1a] fill-[#1b1c1a]/20" />
                </div>
                <div className="text-left">
                    <h3 className="text-[14px] font-black tracking-tight text-white/90">Recompensas</h3>
                    <p className="text-[11px] font-medium text-white/50 mt-0.5">Resgatar recompensas ➔</p>
                </div>
            </div>

            <div className="text-right flex items-center gap-3 relative z-10">
                <div>
                    <div className="text-2xl font-black text-amber-400 tracking-tighter leading-none" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                        {balance}
                    </div>
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mt-1">
                        Moedas NB
                    </div>
                </div>
            </div>
            
            <style jsx>{`
                @keyframes shine {
                    0% { transform: translateX(-150%) skewX(-30deg); }
                    100% { transform: translateX(250%) skewX(-30deg); }
                }
            `}</style>
        </button>
    )
}
