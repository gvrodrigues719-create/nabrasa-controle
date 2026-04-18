'use client'

import React from 'react'
import { Ticket, ChevronRight, Sparkles } from 'lucide-react'

interface Props {
    ticketCount: number
    prizeName: string
    onClick: () => void
}

export default function RaffleCard({ ticketCount, prizeName, onClick }: Props) {
    return (
        <button 
            onClick={onClick}
            className="w-full bg-white rounded-[2rem] p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all text-left flex items-center justify-between group overflow-hidden relative"
        >
            {/* Background Decorative Element */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-50 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Ticket className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-gray-900">{ticketCount}</span>
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md">Tickets</span>
                    </div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tight mt-0.5">Sorteio: {prizeName}</p>
                </div>
            </div>

            <div className="flex items-center gap-2 relative z-10">
                <div className="flex -space-x-2 mr-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center overflow-hidden">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 120}`} alt="participant" />
                        </div>
                    ))}
                </div>
                <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <ChevronRight className="w-4 h-4" />
                </div>
            </div>
        </button>
    )
}
