'use client'

import React from 'react'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface Props {
    lateCount: number
    isDemoMode?: boolean
}

export default function OperationalAlertBanner({ lateCount, isDemoMode }: Props) {
    if (lateCount === 0) return null
    const baseUrl = isDemoMode ? '/moc-demo' : '/dashboard'

    return (
        <Link 
            href={`${baseUrl}/checklist`}
            className="flex items-center gap-4 p-4 rounded-2xl bg-[#FFF1F0] border border-[#FEE2E2] shadow-sm active:scale-[0.98] transition-all group"
        >
            <div className="w-10 h-10 rounded-xl bg-[#FECECB] flex items-center justify-center text-[#B13A2B] group-hover:bg-[#B13A2B] group-hover:text-white transition-all">
                <AlertTriangle className="w-5 h-5 fill-current" />
            </div>
            
            <div className="flex-1">
                <h4 className="text-sm font-black text-[#1b1c1a] leading-none">Atraso Identificado</h4>
                <p className="text-[10px] font-bold text-[#b13a2b] uppercase tracking-widest mt-1">
                    {lateCount} {lateCount === 1 ? 'tarefa pendente' : 'tarefas pendentes'} há mais de 2h
                </p>
            </div>

            <div className="flex items-center gap-1 text-[9px] font-black text-[#B13A2B] uppercase tracking-widest bg-white/50 px-2 py-1 rounded-lg">
                Resolver <ArrowRight className="w-3 h-3" />
            </div>
        </Link>
    )
}
