"use client"

import { useEffect, useState } from 'react'
import { getOperationalMirrorAction } from '@/app/actions/checklistAction'
import ShiftMetrics from './ShiftMetrics'
import SectorGrid from './SectorGrid'
import AttentionList from './AttentionList'
import ExceptionCenter from './ExceptionCenter'
import ManagerQuickActions from './ManagerQuickActions'
import SystemArchitectureHub from './SystemArchitectureHub'
import { RefreshCw, Clock, ShieldCheck, ArrowRight, Eye, CalendarSearch, Package, FileText } from 'lucide-react'
import Link from 'next/link'
import { useDashboardIdentity } from '../../hooks/useDashboardIdentity'

export default function ManagerHome() {
    const { userName, userRole } = useDashboardIdentity()
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
    const overview = data?.overview || { total: 0, completed: 0, pending: 0, late: 0, critical: 0, lossesCount: 0, pendingIssuesCount: 0, openCounts: 0 }

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
            
            {/* 1. OPERAÇÃO AGORA (DIAGNÓSTICO E MÉTRICAS) */}
            <section>
                <ShiftMetrics overview={overview} />
            </section>

            {/* 2. AÇÕES OPERACIONAIS (TAREFAS DIRETAS) */}
            <ManagerQuickActions 
                lateCount={overview.late} 
                openCounts={overview.openCounts}
                userRole={userRole}
            />

            {/* 3. FRENTES DE GESTÃO */}
            <SystemArchitectureHub />

            {/* EXCEÇÕES E ATENÇÃO (DINÂMICOS) */}
            {data?.exceptions?.length > 0 && <ExceptionCenter exceptions={data.exceptions} />}
            <AttentionList collaborators={data?.collaborators || []} />

            {/* MONITORAMENTO POR SETOR (COMPACTO) */}
            <section className="space-y-2">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status das Áreas</h3>
                    <Link 
                        href="/dashboard/areas"
                        className="flex items-center gap-1.5 text-[10px] font-black text-[#B13A2B] uppercase tracking-widest hover:opacity-70 transition-opacity"
                    >
                        Diagnóstico
                        <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
                {data && <SectorGrid bySector={data.bySector} />}
            </section>

        </div>
    )
}
