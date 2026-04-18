"use client"

import { useState } from 'react'
import { RefreshCw, Clock, History } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import ShiftMetrics from './ShiftMetrics'
import SectorGrid from './SectorGrid'
import CollaboratorTracker from './CollaboratorTracker'
import ExceptionCenter from './ExceptionCenter'

interface OperationalDashboardProps {
    data: any | null;
    onRefresh: () => void;
}

export default function OperationalDashboard({ data, onRefresh }: OperationalDashboardProps) {
    const [isRefreshing, setIsRefreshing] = useState(false)

    const handleRefresh = async () => {
        setIsRefreshing(true)
        await onRefresh()
        setTimeout(() => setIsRefreshing(false), 500)
    }

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-[32px] border border-gray-100">
                <History className="w-12 h-12 text-gray-200 mb-4" />
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Aguardando dados operacionais...</p>
                <button 
                    onClick={handleRefresh}
                    className="mt-4 px-6 py-3 bg-[#B13A2B] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                >
                    Carregar Agora
                </button>
            </div>
        )
    }

    const lastUpdated = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header com Refresh */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 leading-tight">Espelho do Turno</h2>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <Clock className="w-3 h-3" />
                        Atualizado às {lastUpdated}
                    </div>
                </div>
                <button 
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-[#B13A2B] hover:border-[#B13A2B]/40 active:scale-95 transition-all shadow-sm"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Atualizar Agora
                </button>
            </div>

            {/* Centro de Exceções */}
            <ExceptionCenter exceptions={data.exceptions} />

            {/* Métricas do Turno */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <span className="w-1.5 h-6 bg-[#B13A2B] rounded-full" />
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Status de Execução</h3>
                </div>
                <ShiftMetrics overview={data.overview} />
            </section>

            {/* Grade de Setores */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <span className="w-1.5 h-6 bg-[#B13A2B] rounded-full" />
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Monitoramento por Área</h3>
                </div>
                <SectorGrid bySector={data.bySector} />
            </section>

            {/* Rastreamento por Equipe */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <span className="w-1.5 h-6 bg-[#B13A2B] rounded-full" />
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Performance Individual</h3>
                </div>
                <CollaboratorTracker collaborators={data.collaborators} />
            </section>
        </div>
    )
}
