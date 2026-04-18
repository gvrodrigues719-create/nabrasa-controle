"use client"

import { useEffect, useState } from 'react'
import { getOperationalMirrorAction } from '@/app/actions/checklistAction'
import ShiftMetrics from './ShiftMetrics'
import SectorGrid from './SectorGrid'
import CollaboratorTracker from './CollaboratorTracker'
import ExceptionCenter from './ExceptionCenter'
import ManagerQuickActions from './ManagerQuickActions'
import { RefreshCw, Clock } from 'lucide-react'

export default function ManagerHome() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)

    const fetchData = async () => {
        setIsRefreshing(true)
        const res = await getOperationalMirrorAction()
        if (res.success) setData(res.data)
        setLoading(false)
        setIsRefreshing(false)
    }

    useEffect(() => {
        fetchData()
    }, [])

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#B13A2B] border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4">Montando Torre de Controle...</p>
        </div>
    )

    const lastUpdated = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Cabeçalho de Controle */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-xl font-black text-gray-900 leading-tight">Espelho do Turno</h2>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <Clock className="w-3.5 h-3.5" />
                        Atualizado às {lastUpdated}
                    </div>
                </div>
                <button 
                    onClick={fetchData}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-2xl font-black text-[10px] uppercase tracking-widest text-[#B13A2B] hover:border-[#B13A2B]/40 active:scale-95 transition-all shadow-sm"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Atualizar
                </button>
            </div>

            {/* Exceções Mentenais */}
            {data?.exceptions?.length > 0 && <ExceptionCenter exceptions={data.exceptions} />}

            {/* Resumo do Turno */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <span className="w-1.5 h-6 bg-[#B13A2B] rounded-full" />
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Leitura do Turno</h3>
                </div>
                {data && <ShiftMetrics overview={data.overview} />}
            </section>

            {/* Execução por Setor (Grade Fixa) */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <span className="w-1.5 h-6 bg-[#B13A2B] rounded-full" />
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Monitoramento por Área</h3>
                </div>
                {data && <SectorGrid bySector={data.bySector} />}
            </section>

            {/* Execução por Pessoa */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <span className="w-1.5 h-6 bg-[#B13A2B] rounded-full" />
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Monitoramento de Equipe</h3>
                </div>
                {data && <CollaboratorTracker collaborators={data.collaborators} />}
            </section>

            {/* Ações Rápidas e Gestão */}
            <ManagerQuickActions />
        </div>
    )
}
