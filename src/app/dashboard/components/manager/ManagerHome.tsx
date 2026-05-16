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
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
            
            {/* 1. OPERAÇÃO AGORA (DIAGNÓSTICO E MÉTRICAS) */}
            <section className="space-y-4">
                <ShiftMetrics overview={overview} />
            </section>

            {/* 2. AÇÕES RÁPIDAS (TAREFAS DIRETAS) */}
            <ManagerQuickActions 
                lateCount={overview.late} 
                userRole={userRole}
            />

            {/* 3. FRENTES DE GESTÃO */}
            <SystemArchitectureHub />

            {/* 4. BLOCO DE CONTAGENS (COMPACTO) */}
            <section className="bg-gray-50 border border-gray-100 rounded-[2rem] p-5 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white text-indigo-600 flex items-center justify-center shadow-sm border border-gray-100">
                        <Package className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-tight leading-none mb-1">Estoques</h3>
                        <p className="text-[10px] font-bold text-gray-400">Auditoria e histórico de contagens.</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <Link href="/dashboard/admin/history/sessions"
                        className="flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95">
                        <Eye className="w-3.5 h-3.5" />
                        Ao Vivo
                    </Link>
                    <Link href="/dashboard/admin/counts/history"
                        className="flex items-center justify-center gap-2 py-3 bg-white text-gray-900 border border-gray-100 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95">
                        <CalendarSearch className="w-3.5 h-3.5" />
                        Histórico
                    </Link>
                </div>
            </section>

            {/* EXCEÇÕES E ATENÇÃO (DINÂMICOS) */}
            {data?.exceptions?.length > 0 && <ExceptionCenter exceptions={data.exceptions} />}
            <AttentionList collaborators={data?.collaborators || []} />

            {/* MONITORAMENTO POR SETOR (COMPACTO) */}
            <section className="space-y-3">
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
