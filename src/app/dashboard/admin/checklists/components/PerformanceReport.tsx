"use client"

import { useState, useEffect } from 'react'
import { getOperationalMirrorAction, getPendingIssuesAction } from '@/app/actions/checklistAction'
import { 
    BarChart3, 
    AlertCircle, 
    CheckCircle2, 
    Clock, 
    Activity, 
    Loader2,
    ChevronRight,
    ArrowRightCircle,
    ShieldAlert
} from 'lucide-react'

export default function PerformanceReport() {
    const [stats, setStats] = useState<any>(null)
    const [pendingIssues, setPendingIssues] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            const [mirrorRes, issuesRes] = await Promise.all([
                getOperationalMirrorAction(),
                getPendingIssuesAction()
            ])
            if (mirrorRes.success) setStats(mirrorRes.data)
            if (issuesRes.success) setPendingIssues(issuesRes.data || [])
            setLoading(false)
        }
        fetchData()
    }, [])

    if (loading) return (
        <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#B13A2B] animate-spin" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4">Calculando Conformidade por Setor...</p>
        </div>
    )

    const overview = stats?.overview || {}
    const bySector = stats?.bySector || {}

    return (
        <div className="space-y-8">
            {/* KPI OVERVIEW */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Hoje</p>
                    <p className="text-3xl font-black text-gray-900">{overview.total}</p>
                    <div className="mt-2 h-1 bg-gray-50 rounded-full overflow-hidden">
                        <div className="h-full bg-gray-200" style={{ width: '100%' }} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Concluídos</p>
                    <p className="text-3xl font-black text-emerald-600">{overview.completed}</p>
                    <div className="mt-2 h-1 bg-emerald-50 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${(overview.completed / overview.total) * 100}%` }} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Em Atraso</p>
                    <p className="text-3xl font-black text-amber-600">{overview.late}</p>
                    <div className="mt-2 h-1 bg-amber-50 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500" style={{ width: `${(overview.late / overview.total) * 100}%` }} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                    <p className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1">Críticos</p>
                    <p className="text-3xl font-black text-red-600">{overview.critical}</p>
                    <div className="mt-2 h-1 bg-red-50 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500" style={{ width: `${(overview.critical / overview.total) * 100}%` }} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* COMPLIANCE BY SECTOR */}
                <div className="bg-white rounded-[40px] border border-gray-200 shadow-sm p-8 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gray-50 rounded-full -mr-32 -mt-32 -z-0" />
                    
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                <Activity className="w-4 h-4 text-[#B13A2B]" />
                                Conformidade por Setor
                            </h3>
                        </div>

                        <div className="space-y-6">
                            {Object.entries(bySector).map(([key, data]: [string, any]) => {
                                const percent = data.total > 0 ? (data.completed / data.total) * 100 : 0
                                return (
                                    <div key={key} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{key}</p>
                                                <p className="text-sm font-black text-gray-900 uppercase">{data.completed} / {data.total} <span className="text-[10px] font-bold text-gray-300 lowercase ml-1">concluídos</span></p>
                                            </div>
                                            <p className={`text-lg font-black ${percent === 100 ? 'text-emerald-500' : percent > 50 ? 'text-amber-500' : 'text-gray-300'}`}>
                                                {Math.round(percent)}%
                                            </p>
                                        </div>
                                        <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all duration-1000 ${percent === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                                style={{ width: `${percent}%` }} 
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* ACTIVE PENDING ISSUES */}
                <div className="bg-gray-900 rounded-[40px] shadow-2xl p-8 flex flex-col h-full border border-gray-800">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-red-500" />
                            Pendências Operacionais
                        </h3>
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/10">
                            {pendingIssues.length} Ativas
                        </span>
                    </div>

                    <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px] pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {pendingIssues.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500/20 mb-4" />
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Nenhuma pendência pendente</p>
                            </div>
                        ) : (
                            pendingIssues.map((issue) => (
                                <div key={issue.id} className="bg-white/5 border border-white/10 rounded-3xl p-5 group hover:bg-white/10 transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${
                                                issue.severity === 'critical' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                                                issue.severity === 'high' ? 'bg-orange-500' : 'bg-amber-500'
                                            }`} />
                                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">{issue.area || 'Geral'}</p>
                                        </div>
                                        <span className="text-[8px] font-black text-white/30 uppercase tracking-widest whitespace-nowrap">
                                            {new Date(issue.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h4 className="text-sm font-black text-white mb-1">{issue.title}</h4>
                                    <p className="text-[10px] text-white/60 line-clamp-2 mb-4 leading-relaxed">{issue.description}</p>
                                    
                                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 bg-white/5 rounded-lg flex items-center justify-center">
                                                <Clock className="w-3 h-3 text-white/20" />
                                            </div>
                                            <span className="text-[10px] font-bold text-white/30">{issue.turno || 'Turno'}</span>
                                        </div>
                                        <button className="flex items-center gap-1.5 text-[9px] font-black text-emerald-400 uppercase tracking-widest group-hover:scale-105 transition-transform">
                                            Tratar Agora
                                            <ArrowRightCircle className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
