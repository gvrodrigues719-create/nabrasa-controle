'use client'

import React from 'react'
import { PlayCircle, ArrowRight, Timer } from 'lucide-react'
import Link from 'next/link'
import { ActiveSession } from '../../hooks/useDashboardData'

interface Props {
    session: ActiveSession | null
}

export default function ContinueRoutineCard({ session }: Props) {
    if (!session) return null

    const isGeneric = session.routineName === 'Rotina' || session.groupName === 'Setor'
    if (isGeneric) return null

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Link 
                href={`/dashboard/${session.type}/${session.routineId}/${session.groupId}?returnTo=/dashboard`}
                className="block relative overflow-hidden bg-[#1b1c1a] rounded-[2.5rem] p-6 shadow-xl shadow-black/10 group active:scale-[0.98] transition-all"
            >
                {/* Background Pattern / Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#B13A2B] opacity-10 blur-3xl rounded-full -mr-10 -mt-10 group-hover:opacity-20 transition-opacity" />
                
                <div className="relative flex items-center gap-5">
                    {/* Icon Base */}
                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white shrink-0">
                        <PlayCircle className="w-7 h-7 fill-white/10 group-hover:scale-110 transition-transform duration-500" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-500/20 border border-red-500/20">
                                <Timer className="w-3 h-3 text-red-400" />
                                <span className="text-[8px] font-black text-red-200 uppercase tracking-widest">Em Andamento</span>
                            </div>
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Continuar de onde parei</span>
                        </div>
                        
                        <h4 className="text-xl font-black text-white leading-tight truncate">
                            {session.routineName}
                        </h4>
                        <p className="text-xs font-bold text-white/60 tracking-tight mt-0.5">
                            Setor: <span className="text-white">{session.groupName}</span>
                        </p>
                    </div>

                    {/* Arrow CTA */}
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-[#B13A2B] group-hover:shadow-lg group-hover:shadow-red-500/20 transition-all duration-500">
                        <ArrowRight className="w-5 h-5" />
                    </div>
                </div>
            </Link>
        </div>
    )
}
