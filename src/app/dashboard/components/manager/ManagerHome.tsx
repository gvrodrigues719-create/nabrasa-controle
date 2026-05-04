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
    const { userName } = useDashboardIdentity()
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
            
            {/* 1. HEADER OPERACIONAL */}
            <div className="flex justify-between items-start pt-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 leading-tight">Bom turno, {userName}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Unidade Matriz</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {lastUpdated}
                        </span>
                    </div>
                </div>
                <button 
                    onClick={fetchData}
                    disabled={isRefreshing}
                    className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-400 hover:text-gray-900 active:scale-95 transition-all"
                >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* 2. SITUAÇÃO DO TURNO (O CORAÇÃO) */}
            <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-gray-900 rounded-full" />
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Situação do Turno</h3>
                    </div>
                </div>
                <ShiftMetrics overview={overview} />
            </section>

            {/* 3. AÇÕES RÁPIDAS (INTERVENÇÃO DIRETA) */}
            <ManagerQuickActions 
                lateCount={overview.late} 
            />

            {/* 4. BLOCO UNIFICADO DE CONTAGENS */}
            <section className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Package className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight leading-none mb-1.5">Contagens de Estoque</h3>
                        <p className="text-xs font-medium text-gray-400">Acompanhe execução, confira histórico e exporte Excel.</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Link href="/dashboard/admin/history/sessions"
                        className="flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-colors active:scale-95">
                        <Eye className="w-4 h-4" />
                        Ao Vivo
                    </Link>
                    <Link href="/dashboard/admin/counts/history"
                        className="flex items-center justify-center gap-2 py-4 bg-gray-50 text-gray-900 border border-gray-100 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-colors active:scale-95">
                        <CalendarSearch className="w-4 h-4" />
                        Histórico
                    </Link>
                </div>
                
                <Link href="/dashboard/admin/counts/history?export=true"
                    className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-gray-100 text-gray-400 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:text-indigo-600 transition-colors">
                    <FileText className="w-3.5 h-3.5" />
                    Exportar Relatórios (XLSX)
                </Link>
            </section>

            {/* 5. EQUIPE EM ATENÇÃO */}
            <AttentionList collaborators={data?.collaborators || []} />

            {/* 6. MONITORAMENTO POR SETOR */}
            <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <span className="w-1 h-4 bg-gray-200 rounded-full" />
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status das Áreas</h3>
                    </div>
                    <Link 
                        href="/dashboard/areas"
                        className="flex items-center gap-1.5 text-[10px] font-black text-[#B13A2B] uppercase tracking-widest hover:opacity-70 transition-opacity"
                    >
                        Ver Diagnóstico
                        <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
                {data && <SectorGrid bySector={data.bySector} />}
            </section>

            {/* EXCEÇÕES DINÂMICAS */}
            {data?.exceptions?.length > 0 && <ExceptionCenter exceptions={data.exceptions} />}

            {/* 7. ÁREAS DO SISTEMA (Management Hub) */}
            <div className="pt-8 border-t border-gray-100">
                <SystemArchitectureHub />
            </div>
        </div>
    )
}
