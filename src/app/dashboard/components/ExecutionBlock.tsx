'use client'

import React from 'react'
import { ClipboardList, ListChecks, Zap, ArrowRight, PackageX } from 'lucide-react'
import Link from 'next/link'

import { DashboardAction } from '../hooks/useDashboardData'

interface Props {
    routinesCount: number
    countsPending: number
    checklistsPending: number
    onReportLoss: () => void
    recommendedActions: DashboardAction[]
    isDemoMode?: boolean
}

export default function ExecutionBlock({ 
    routinesCount, 
    countsPending, 
    checklistsPending, 
    onReportLoss, 
    recommendedActions,
    isDemoMode 
}: Props) {
    const topRecommended = recommendedActions[0]
    const baseUrl = isDemoMode ? '/moc-demo' : '/dashboard'

    return (
        <section className="animate-in fade-in slide-in-from-bottom-3 duration-700 delay-150">
            <header className="flex items-center justify-between mb-3.5 px-1">
                <p className="text-[10px] font-black text-[#8c716c] uppercase tracking-widest">Ação Prioritária</p>
                <Link href={`${baseUrl}/routines?returnTo=${baseUrl}`} className="text-[10px] font-black text-[#B13A2B] uppercase tracking-tight flex items-center gap-1 group">
                    Ver todas <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>
            </header>
            
            <div className="space-y-3">
                {/* DYNAMIC RECOMMENDATION */}
                {topRecommended && (
                    <Link 
                        href={topRecommended.url}
                        className="block relative overflow-hidden bg-white rounded-[2rem] p-5 border-2 border-[#1b1c1a]/5 flex items-center gap-5 active:scale-[0.98] transition-all group shadow-md"
                    >
                        <div className="relative w-14 h-14 rounded-2xl bg-[#1b1c1a] flex items-center justify-center text-white shrink-0 shadow-lg shadow-black/10">
                            <Zap className="w-7 h-7 fill-amber-400 text-amber-400" />
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#B13A2B] rounded-full border-2 border-white animate-pulse" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <span className="text-[9px] font-black text-[#B13A2B] uppercase tracking-[0.2em] mb-1 block">Próxima na Fila</span>
                            <h4 className="text-[15px] font-black text-[#1b1c1a] truncate leading-tight">{topRecommended.label}</h4>
                            <p className="text-[10px] font-bold text-gray-400 mt-0.5">{topRecommended.description}</p>
                        </div>
                        
                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-[#1b1c1a] group-hover:text-white transition-all">
                            <ArrowRight className="w-5 h-5" />
                        </div>
                    </Link>
                )}

                {/* UNIFIED PRIMARY ACTION: TAREFAS DO TURNO */}
                <Link 
                    href={`${baseUrl}/routines?returnTo=${baseUrl}`}
                    className="relative overflow-hidden bg-white rounded-[2rem] p-6 border border-[#e9e8e5] flex items-center gap-5 active:scale-[0.98] transition-all group shadow-sm hover:shadow-md"
                >
                    {/* Status Light */}
                    <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-5 blur-3xl rounded-full ${routinesCount > 0 ? 'bg-[#B13A2B]' : 'bg-green-500'}`} />
                    
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                        routinesCount > 0 
                            ? 'bg-[#B13A2B]/10 text-[#B13A2B] group-hover:bg-[#B13A2B] group-hover:text-white' 
                            : 'bg-green-50 text-green-600'
                    }`}>
                        <ClipboardList className="w-7 h-7" />
                    </div>
                    
                    <div className="flex-1">
                        <h4 className="text-base font-black text-[#1b1c1a] tracking-tight">Tarefas do Turno</h4>
                        <div className="flex flex-col mt-0.5">
                            <span className="text-[11px] font-black text-[#B13A2B] uppercase tracking-tight">
                                {routinesCount} pendência{routinesCount !== 1 ? 's' : ''} hoje
                            </span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                {countsPending} contagem{countsPending !== 1 ? 's' : ''} • {checklistsPending} checklist{checklistsPending !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>

                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-[#1b1c1a] group-hover:text-white transition-all">
                        <ArrowRight className="w-5 h-5" />
                    </div>
                </Link>

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
