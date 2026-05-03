"use client"

import React from 'react'
import { ArrowRight, ListChecks, Boxes, CheckCircle2, Zap } from 'lucide-react'
import Link from 'next/link'
import { DashboardAction } from '../../hooks/useDashboardData'

interface PriorityActionCardProps {
    action?: DashboardAction;
    loading?: boolean;
}

export default function PriorityActionCard({ action, loading }: PriorityActionCardProps) {
    if (loading) {
        return (
            <div className="mx-1 h-32 bg-white rounded-[2.5rem] animate-pulse border border-gray-100 shadow-sm" />
        )
    }

    if (!action) {
        return (
            <div className="mx-1 p-6 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center justify-between group overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-50/30 rounded-full -mr-16 -mt-16" />
                <div className="flex items-center gap-5 relative z-10">
                    <div className="w-14 h-14 rounded-[1.5rem] bg-green-50 flex items-center justify-center text-green-600 border border-green-100 shadow-inner">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1.5">Status da Casa</p>
                        <h4 className="text-xl font-black text-gray-900 tracking-tight leading-none">Tudo em dia!</h4>
                        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tight">Nenhuma tarefa pendente agora</p>
                    </div>
                </div>
            </div>
        )
    }

    const isOverdue = action.status === 'overdue'
    const isInProgress = action.status === 'in_progress'

    return (
        <Link 
            href={action.url}
            className={`mx-1 block p-6 rounded-[2.5rem] border-2 transition-all active:scale-[0.98] group overflow-hidden relative shadow-lg ${
                isOverdue 
                    ? 'bg-[#1b1c1a] border-[#1b1c1a] shadow-black/10' 
                    : isInProgress
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-white border-[#1b1c1a]/5 hover:border-[#B13A2B]/30'
            }`}
        >
            {/* Background elements */}
            <div className={`absolute top-0 right-0 w-40 h-40 rounded-full -mr-20 -mt-20 opacity-10 transition-transform duration-1000 group-hover:scale-110 ${isOverdue ? 'bg-white' : 'bg-[#B13A2B]'}`} />
            
            <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center shadow-lg transition-transform group-hover:rotate-3 ${
                        isOverdue 
                            ? 'bg-white/10 text-white backdrop-blur-sm border border-white/20' 
                            : 'bg-[#1b1c1a] text-[#B13A2B]'
                    }`}>
                        {action.type === 'checklist' ? <ListChecks className="w-8 h-8" /> : <Boxes className="w-8 h-8" />}
                    </div>
                    
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${
                                isOverdue 
                                    ? 'bg-red-500 text-white' 
                                    : isInProgress 
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-red-50 text-[#B13A2B]'
                            }`}>
                                {isOverdue ? 'Atraso Crítico' : isInProgress ? 'Em Andamento' : 'Ação Prioritária'}
                            </span>
                            {isInProgress && (
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                </span>
                            )}
                        </div>
                        <h4 className={`text-xl font-black tracking-tight leading-none mb-1 ${isOverdue ? 'text-white' : 'text-gray-900 group-hover:text-[#B13A2B] transition-colors'}`}>
                            {action.label}
                        </h4>
                        <div className="flex items-center gap-2">
                            <p className={`text-[10px] font-bold uppercase tracking-tight ${isOverdue ? 'text-white/60' : 'text-gray-400'}`}>
                                {action.description}
                            </p>
                            <span className={`w-1 h-1 rounded-full ${isOverdue ? 'bg-white/20' : 'bg-gray-200'}`} />
                            <p className={`text-[10px] font-black uppercase tracking-widest ${isOverdue ? 'text-[#B13A2B]' : 'text-[#B13A2B]'}`}>
                                {action.type === 'count' ? 'Contagem' : 'Checklist'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                    isOverdue 
                        ? 'bg-white/5 text-white border border-white/10 group-hover:bg-[#B13A2B] group-hover:border-[#B13A2B]' 
                        : 'bg-gray-50 text-gray-300 group-hover:bg-[#1b1c1a] group-hover:text-white group-hover:scale-110'
                }`}>
                    <ArrowRight className="w-6 h-6" />
                </div>
            </div>
            
            {/* CTA Callout */}
            <div className={`mt-5 pt-4 border-t flex items-center justify-between ${isOverdue ? 'border-white/10' : 'border-gray-50'}`}>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${isOverdue ? 'text-white/40' : 'text-gray-400'}`}>
                    {isInProgress ? 'Você tem uma sessão aberta' : 'Clique para iniciar agora'}
                </p>
                <div className="flex items-center gap-1.5">
                    <Zap className={`w-3 h-3 ${isOverdue ? 'text-[#B13A2B]' : 'text-[#B13A2B]'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-tighter ${isOverdue ? 'text-white' : 'text-[#1b1c1a]'}`}>Operação Real</span>
                </div>
            </div>
        </Link>
    )
}
