'use client'

import React from 'react'
import { MapPin, Clock, AlertCircle, CheckCircle2, User } from 'lucide-react'
import { AreaStatus } from '@/app/actions/groupsAction'

interface Props {
    name: string
    progress: number
    status: AreaStatus
    lastUpdate: string
    routinesCount: number
    completedCount: number
}

export default function AreaDiagnosticCard({ 
    name, 
    progress, 
    status, 
    lastUpdate,
    routinesCount,
    completedCount
}: Props) {
    
    const getStatusColor = (status: AreaStatus) => {
        switch (status) {
            case 'completed': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
            case 'pending': return 'text-amber-600 bg-amber-50 border-amber-100';
            case 'delayed': return 'text-red-600 bg-red-50 border-red-100';
            default: return 'text-gray-600 bg-gray-50 border-gray-100';
        }
    }

    const getStatusIcon = (status: AreaStatus) => {
        switch (status) {
            case 'completed': return <CheckCircle2 className="w-3.5 h-3.5" />;
            case 'pending': return <Clock className="w-3.5 h-3.5" />;
            case 'delayed': return <AlertCircle className="w-3.5 h-3.5" />;
            default: return null;
        }
    }

    const statusClass = getStatusColor(status)
    const hasRoutines = routinesCount > 0

    return (
        <div className="bg-white rounded-[2rem] border border-[#eeedea] p-5 shadow-sm space-y-4 hover:border-[#B13A2B]/10 transition-all group">
            <div className="flex items-start justify-between">
                <div className="flex gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        status === 'delayed' ? 'bg-red-50 text-red-500' : 'bg-[#F8F7F4] text-[#8c716c]'
                    }`}>
                        <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-base font-black text-[#1b1c1a] tracking-tight">{name}</h4>
                        {!hasRoutines ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-gray-100 bg-gray-50 text-[9px] font-black uppercase tracking-tight mt-1 text-gray-400">
                                Sem rotina hoje
                            </div>
                        ) : (
                            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-tight mt-1 ${statusClass}`}>
                                {getStatusIcon(status)}
                                {status === 'completed' ? 'Concluído' : status === 'delayed' ? 'Crítico / Atrasado' : 'Em andamento'}
                            </div>
                        )}
                    </div>
                </div>
                {hasRoutines && (
                    <div className="text-right">
                        <div className="text-xl font-black text-[#1b1c1a]">{progress}%</div>
                        <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{completedCount}/{routinesCount} Concluído</div>
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-[#F8F7F4] rounded-full overflow-hidden border border-gray-50/50">
                <div 
                    className={`h-full transition-all duration-1000 ${
                        !hasRoutines ? 'bg-gray-100' :
                        status === 'completed' ? 'bg-emerald-500' :
                        status === 'delayed' ? 'bg-red-500' : 'bg-[#B13A2B]'
                    }`}
                    style={{ width: `${hasRoutines ? progress : 0}%` }}
                />
            </div>

            <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#F8F7F4] flex items-center justify-center">
                        <CheckCircle2 className={`w-3 h-3 ${status === 'completed' ? 'text-emerald-500' : 'text-gray-300'}`} />
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Unidade</p>
                        <p className="text-[10px] font-bold text-[#58413e]">Visão Coletiva</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Última Atualização</p>
                    <p className="text-[10px] font-bold text-[#8c716c]">{lastUpdate}</p>
                </div>
            </div>
        </div>
    )
}
