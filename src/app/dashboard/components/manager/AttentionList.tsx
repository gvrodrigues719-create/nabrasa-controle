"use client"

import { AlertCircle, Clock, CheckCircle2, User, MessageSquare } from 'lucide-react'
import { useState } from 'react'
import ContextualCommentsDrawer from '../ContextualCommentsDrawer'

interface Collaborator {
    name: string;
    position: string;
    sector: string;
    total: number;
    completed: number;
    late: number;
    latest_session_id: string | null;
}

interface AttentionListProps {
    collaborators: Collaborator[];
}

export default function AttentionList({ collaborators }: AttentionListProps) {
    const [chargingTarget, setChargingTarget] = useState<Collaborator | null>(null)
    // Lógica de Hierarquia:
    // 1. Atrasados (late > 0)
    // 2. Em Atenção (total - completed > 0)
    
    const lateTrack = collaborators
        .filter(c => c.late > 0)
        .sort((a, b) => b.late - a.late)

    const pendingTrack = collaborators
        .filter(c => c.late === 0 && (c.total - c.completed) > 0)
        .sort((a, b) => (b.total - b.completed) - (a.total - a.completed))

    const attentionItems = [...lateTrack, ...pendingTrack].slice(0, 4) // No máximo 4 para densidade

    if (attentionItems.length === 0) {
        return (
            <div className="bg-white border border-gray-100 p-4 rounded-[2rem] flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Equipe sem alertas no momento</p>
            </div>
        )
    }

    return (
        <div className="bg-white border border-gray-100 p-5 rounded-[2.5rem] shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Equipe em Atenção</h4>
                <div className="flex gap-2">
                    <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        <span className="text-[8px] font-black text-gray-400 uppercase">Crítico</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span className="text-[8px] font-black text-gray-400 uppercase">Alerta</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {attentionItems.map((c, i) => {
                    const isLate = c.late > 0
                    const pending = c.total - c.completed

                    return (
                        <div key={i} className={`flex items-center justify-between p-3 rounded-2xl border ${isLate ? 'border-red-100 bg-red-50/30' : 'border-gray-100 bg-gray-50/50'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isLate ? 'bg-red-100 text-red-600' : 'bg-white text-gray-400'}`}>
                                    <User className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-gray-900 leading-tight">{c.name.split(' ')[0]}</p>
                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">{c.sector || 'Geral'}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <div className="text-right">
                                    {isLate ? (
                                        <div className="flex items-center gap-1 text-red-600">
                                            <AlertCircle className="w-3 h-3" />
                                            <span className="text-[10px] font-black">{c.late} Atraso</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 text-amber-600">
                                            <Clock className="w-3 h-3" />
                                            <span className="text-[10px] font-black">{pending} Pend.</span>
                                        </div>
                                    )}
                                </div>
                                {c.latest_session_id && (
                                    <button 
                                        onClick={() => setChargingTarget(c)}
                                        className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter transition-all active:scale-95 ${
                                            isLate ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'
                                        }`}
                                    >
                                        <MessageSquare className="w-2.5 h-2.5" />
                                        Cobrar
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* DRAWER DE COBRANÇA */}
            {chargingTarget && (
                <ContextualCommentsDrawer 
                    isOpen={!!chargingTarget}
                    onClose={() => setChargingTarget(null)}
                    referenceId={chargingTarget.latest_session_id!}
                    referenceType="session"
                    title={`Cobrança: ${chargingTarget.name}`}
                />
            )}
        </div>
    )
}
