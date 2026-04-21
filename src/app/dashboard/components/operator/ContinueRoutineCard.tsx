'use client'

import React from 'react'
import { ArrowRight, Timer, Play } from 'lucide-react'
import Link from 'next/link'
import { ActiveSession } from '../../hooks/useDashboardData'

interface Props {
    session: ActiveSession | null
    isDemoMode?: boolean
}

export default function ContinueRoutineCard({ session, isDemoMode }: Props) {
    if (!session) return null
    const baseUrl = isDemoMode ? '/moc-demo' : '/dashboard'

    const isGeneric = session.routineName === 'Rotina' || session.groupName === 'Setor'
    if (isGeneric) return null

    return (
        <div className="mx-1 animate-in fade-in slide-in-from-top-2 duration-500">
            <Link 
                href={`${baseUrl}/${session.type}/${session.routineId}/${session.groupId}?returnTo=${baseUrl}`}
                className="flex items-center justify-between p-3.5 bg-amber-50 rounded-2xl border border-amber-100 shadow-sm active:scale-[0.99] transition-all group group-hover:bg-amber-100/50"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 border border-amber-200/50 group-hover:scale-105 transition-transform">
                        <Play className="w-4 h-4 fill-amber-600" />
                    </div>
                    
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest px-1.5 py-0.5 bg-white rounded border border-amber-200">
                                Em Andamento
                            </span>
                        </div>
                        <p className="text-sm font-black text-amber-900 truncate leading-tight">
                            {session.routineName}
                        </p>
                        <p className="text-[9px] font-bold text-amber-700/60 uppercase tracking-tight">
                            {session.groupName}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 pl-4 shrink-0">
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-tight group-hover:translate-x-1 transition-transform">
                        Continuar
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-white/50 flex items-center justify-center text-amber-400 group-hover:text-amber-600 transition-colors">
                        <ArrowRight className="w-4 h-4" />
                    </div>
                </div>
            </Link>
        </div>
    )
}
