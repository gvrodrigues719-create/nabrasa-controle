"use client"

import { useEffect, useState } from 'react'
import { getOperationalMirrorAction } from '@/app/actions/checklistAction'
import ShiftMetrics from './ShiftMetrics'
import SectorGrid from './SectorGrid'
import AttentionList from './AttentionList'
import ExceptionCenter from './ExceptionCenter'
import ManagerQuickActions from './ManagerQuickActions'
import SystemArchitectureHub from './SystemArchitectureHub'
import { RefreshCw, Clock, ShieldCheck, ArrowRight } from 'lucide-react'
import Link from 'next/link'

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
    const status = overview.late > 0 
        ? { label: 'Atrasos no turno', color: 'bg-red-50 text-red-600 border-red-100' }
        : overview.critical > 0
        ? { label: 'Em atenção', color: 'bg-purple-50 text-purple-600 border-purple-100' }
        : overview.pending > 0
        ? { label: 'Operação sob controle', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' }
        : { label: 'Sem alertas no momento', color: 'bg-gray-50 text-gray-500 border-gray-100' }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
            {/* CABEÇALHO LIVE */}
            <div className="flex justify-between items-center mb-2 px-1">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-black text-gray-900 leading-none">Espelho do Turno</h2>
                    <span className={`px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider ${status.color}`}>
                        {status.label}
                    </span>
                </div>
                <button 
                    onClick={fetchData}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
                >
                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Sincronizando...' : `Atualizado: ${lastUpdated}`}
                </button>
            </div>

            {/* 1. MÉTRICAS PRINCIPAIS (EXECUTIVO) */}
            <ShiftMetrics overview={overview} />

            {/* 2. EQUIPE EM ATENÇÃO (CRÍTICO + PREVENTIVO) */}
            <AttentionList collaborators={data?.collaborators || []} />

            {/* 3. SETORES EM TEMPO REAL */}
            <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <span className="w-1 h-4 bg-gray-200 rounded-full" />
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Monitoramento por Setor</h3>
                    </div>
                    <Link 
                        href="/dashboard/areas"
                        className="flex items-center gap-1.5 text-[10px] font-black text-[#B13A2B] uppercase tracking-widest hover:opacity-70 transition-opacity"
                    >
                        Ver Diagnóstico Completo
                        <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
                {data && <SectorGrid bySector={data.bySector} />}
            </section>

            {/* EXCEÇÕES DINÂMICAS (CASO HAJA) */}
            {data?.exceptions?.length > 0 && <ExceptionCenter exceptions={data.exceptions} />}

            <div className="pt-4 border-t border-gray-100">
                <ManagerQuickActions 
                    lateCount={overview.late} 
                />
            </div>


            {/* 5. ÁREAS DO SISTEMA (Management Hub) */}
            <div className="pt-8 border-t border-gray-100">
                <SystemArchitectureHub />
            </div>
        </div>
    )
}
