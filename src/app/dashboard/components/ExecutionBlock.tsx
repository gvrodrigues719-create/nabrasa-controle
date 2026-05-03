'use client'

import React from 'react'
import { ClipboardList, ListChecks, ArrowRight, PackageX, Boxes } from 'lucide-react'
import Link from 'next/link'

import { DashboardAction } from '../hooks/useDashboardData'

interface Props {
    routinesCount: number
    countsPending: number
    checklistsPending: number
    onReportLoss: () => void
    recommendedActions: DashboardAction[]
    isDemoMode?: boolean
    isTester?: boolean
}

export default function ExecutionBlock({ 
    routinesCount, 
    countsPending, 
    checklistsPending, 
    onReportLoss, 
    recommendedActions,
    isDemoMode,
    isTester
}: Props) {
    const topRecommended = recommendedActions[0]
    const baseUrl = isDemoMode ? '/moc-demo' : '/dashboard'

    const getActionIcon = (type: string) => {
        switch (type) {
            case 'count': return <Boxes className="w-7 h-7 text-amber-500" />
            case 'checklist': return <ListChecks className="w-7 h-7 text-amber-500" />
            default: return <Boxes className="w-7 h-7 text-amber-500" />
        }
    }

    return (
        <section className="animate-in fade-in slide-in-from-bottom-3 duration-700 delay-150">
            <div className="flex flex-col gap-2">
                {/* MINIMALIST UTILITY LINE: TAREFAS DO TURNO — Solo aparece se houver pendências */}
                {routinesCount > 0 && (
                    <Link 
                        href={`${baseUrl}/routines?returnTo=${baseUrl}`}
                        className="flex items-center justify-between px-4 py-2 bg-gray-50/50 rounded-xl border border-gray-100/30 active:opacity-70 transition-all group animate-in fade-in duration-500 -mt-1"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-[#B13A2B] shadow-sm border border-gray-100/50 group-hover:scale-105 transition-transform">
                                <ListChecks className="w-4 h-4" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[12px] font-bold text-[#1b1c1a]">
                                    {isTester ? 'Modo teste' : `${routinesCount} ${routinesCount === 1 ? 'tarefa' : 'tarefas'} hoje`}
                                </span>
                                <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-tighter">
                                    {isTester ? 'Todas as contagens liberadas' : [
                                        countsPending > 0 ? `${countsPending} ${countsPending === 1 ? 'contagem' : 'contagens'}` : null,
                                        checklistsPending > 0 ? `${checklistsPending} ${checklistsPending === 1 ? 'checklist' : 'checklists'}` : null
                                    ].filter(Boolean).join(' • ')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-[#B13A2B] uppercase tracking-tighter hover:underline">
                            {isTester ? 'Ver contagens' : 'Ver lista'} <ArrowRight className="w-2.5 h-2.5" />
                        </div>
                    </Link>
                )}
                {/* 2. Ações Secundárias */}

                {/* SECONDARY ACTION: REGISTRAR PERDA */}
                <button 
                    onClick={onReportLoss}
                    className="w-full bg-white rounded-[1.5rem] p-4.5 flex items-center justify-between active:scale-[0.98] transition-all group shadow-sm border border-[#fde68a]/50 hover:border-[#fde68a] min-h-[64px]"
                    style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fffcf0 100%)' }}
                >
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 transition-transform group-hover:scale-105 border border-amber-100">
                            <PackageX className="w-5 h-5" />
                        </div>
                        <div className="text-left font-sans">
                            <p className="text-[14px] font-black text-[#1b1c1a] tracking-tight leading-none mb-1">Registrar perda</p>
                            <p className="text-[10px] font-bold text-[#8c716c] uppercase tracking-widest">Desperdício, avaria ou descarte</p>
                        </div>
                    </div>
                    <div className="bg-amber-50 p-1.5 rounded-lg text-amber-300 group-hover:text-amber-600 transition-colors">
                        <ArrowRight className="w-4 h-4" />
                    </div>
                </button>
            </div>
        </section>
    )
}
