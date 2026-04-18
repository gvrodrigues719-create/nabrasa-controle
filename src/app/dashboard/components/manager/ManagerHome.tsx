"use client"

import { useEffect, useState } from 'react'
import { getOperationalMirrorAction } from '@/app/actions/checklistAction'
import ShiftMetrics from './ShiftMetrics'
import SectorGrid from './SectorGrid'
import CollaboratorTracker from './CollaboratorTracker'
import ExceptionCenter from './ExceptionCenter'
import ManagerQuickActions from './ManagerQuickActions'
import SystemArchitectureHub from './SystemArchitectureHub'
import { RefreshCw, Clock, ShieldCheck } from 'lucide-react'

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
            <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4">Sincronizando Torre de Controle...</p>
        </div>
    )

    const lastUpdated = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const overview = data?.overview || { total: 0, completed: 0, pending: 0, late: 0, critical: 0, lossesCount: 0, deadRulesCount: 0 }

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
            {/* 1. CABEÇALHO DO ESPELHO */}
            <div className="flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-black text-gray-900 leading-tight">Espelho do Turno</h2>
                        {overview.late === 0 && overview.critical === 0 && (
                            <ShieldCheck className="w-4 h-4 text-green-500" />
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <Clock className="w-3.5 h-3.5" />
                        Live • {lastUpdated}
                    </div>
                </div>
                <button 
                    onClick={fetchData}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-100 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-900 hover:border-gray-900/10 active:scale-95 transition-all shadow-sm"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* 2. EXCEÇÕES (DINÂMICO) */}
            {data?.exceptions?.length > 0 && <ExceptionCenter exceptions={data.exceptions} />}

            {/* 3. ESPELHO ULTRA-DENSO */}
            <section>
                <div className="flex items-center gap-2 mb-5">
                    <span className="w-1.5 h-6 bg-gray-900 rounded-full" />
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Status de Operação</h3>
                </div>
                <ShiftMetrics overview={overview} />
            </section>

            {/* 4. MONITORAMENTO DEPARTAMENTAL */}
            <section>
                <div className="flex items-center gap-2 mb-5">
                    <span className="w-1.5 h-6 bg-gray-900 rounded-full text-gray-400" />
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Setores em Tempo Real</h3>
                </div>
                {data && <SectorGrid bySector={data.bySector} />}
            </section>

            {/* 5. INTERVENÇÃO OPERACIONAL CONTEXTUAL */}
            <div className="pt-8 border-t border-gray-100">
                <ManagerQuickActions 
                    lateCount={overview.late} 
                    pendingRulesCount={overview.deadRulesCount} 
                />
            </div>

            {/* 6. PERFORMANCE INDIVIDUAL (REBAIXADO) */}
            <section className="pt-8 border-t border-gray-100 opacity-60 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-2 mb-5">
                    <span className="w-1.5 h-6 bg-gray-200 rounded-full" />
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Monitoramento de Equipe</h3>
                </div>
                {data && <CollaboratorTracker collaborators={data.collaborators} />}
            </section>

            {/* 7. ÁREAS DO SISTEMA (Management Hub) */}
            <div className="pt-12 border-t border-gray-100">
                <SystemArchitectureHub />
            </div>
        </div>
    )
}
