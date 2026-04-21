"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
    getAllChecklistSessionsAction,
    getOperationalMirrorAction 
} from '@/app/actions/checklistAction'
import { 
    getManagerRankingSummaryAction
} from '@/app/actions/gamificationAction'
import { 
    ClipboardCheck, 
    Trophy, 
    ChevronRight, 
    Clock, 
    User, 
    ArrowLeft,
    Loader2,
    CalendarDays,
    Activity,
    History as HistoryIcon,
    ChevronDown,
    ChevronUp
} from 'lucide-react'
import OperationalDashboard from '@/app/dashboard/components/manager/OperationalDashboard'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function AuditoriaOperacionalPage() {
    const router = useRouter()
    const [history, setHistory] = useState<any[]>([])
    const [ranking, setRanking] = useState<any[]>([])
    const [operationalData, setOperationalData] = useState<any | null>(null)
    const [loading, setLoading] = useState(true)
    
    // Estados para controlar expansão de seções no mobile
    const [openSections, setOpenSections] = useState({
        mirror: true,
        history: true,
        ranking: true
    })

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        const [mirrorRes, historyRes, rankingRes] = await Promise.all([
            getOperationalMirrorAction(),
            getAllChecklistSessionsAction(),
            getManagerRankingSummaryAction()
        ])

        if (mirrorRes.success) setOperationalData(mirrorRes.data)
        if (historyRes.success) setHistory(historyRes.data || [])
        if (rankingRes.success) setRanking((rankingRes as any).ranking || [])
        
        setLoading(false)
    }

    const toggleSection = (section: keyof typeof openSections) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }))
    }

    return (
        <div className="pb-20 min-h-screen bg-gray-50/30">
            {/* HEADER FIXO */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-20 px-4 py-4 md:px-6 shadow-sm">
                <div className="flex items-center gap-4 max-w-5xl mx-auto">
                    <button 
                        onClick={() => router.push('/dashboard/admin')}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-all active:scale-95"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                            <Activity className="w-5 h-5 text-[#B13A2B]" />
                            Auditoria Operacional
                        </h1>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Acompanhamento e Performance</p>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 md:px-6 pt-6 space-y-8">
                
                {/* 1. ESPELHO OPERACIONAL */}
                <section className="bg-white rounded-[2.5rem] border border-gray-200 overflow-hidden shadow-sm">
                    <button 
                        onClick={() => toggleSection('mirror')}
                        className="w-full p-6 flex justify-between items-center bg-gray-50/50 border-b border-gray-100"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                                <Activity className="w-4 h-4" />
                            </div>
                            <h3 className="font-black text-xs uppercase tracking-widest text-gray-700">Espelho Operacional</h3>
                        </div>
                        {openSections.mirror ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>
                    {openSections.mirror && (
                        <div className="p-6">
                            {loading ? (
                                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
                            ) : (
                                <OperationalDashboard data={operationalData} onRefresh={fetchData} />
                            )}
                        </div>
                    )}
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* 2. RANKING DE PERFORMANCE */}
                    <section className="bg-white rounded-[2.5rem] border border-gray-200 overflow-hidden shadow-sm h-fit">
                        <button 
                            onClick={() => toggleSection('ranking')}
                            className="w-full p-6 flex justify-between items-center bg-gray-50/50 border-b border-gray-100"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                                    <Trophy className="w-4 h-4" />
                                </div>
                                <h3 className="font-black text-xs uppercase tracking-widest text-gray-700">Ranking da Equipe</h3>
                            </div>
                            {openSections.ranking ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </button>
                        {openSections.ranking && (
                            <div className="p-6 space-y-4">
                                {loading ? (
                                    <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
                                ) : ranking.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400 uppercase text-[10px] font-bold tracking-widest">Sem dados de ranking</div>
                                ) : (
                                    ranking.map((player, idx) => (
                                        <div key={player.userId} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${
                                                    idx === 0 ? 'bg-amber-100 text-amber-600' : 
                                                    idx === 1 ? 'bg-gray-100 text-gray-600' : 
                                                    idx === 2 ? 'bg-orange-100 text-orange-700' : 
                                                    'bg-gray-50 text-gray-400'
                                                }`}>
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 text-sm">{player.name}</p>
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase">Operação NaBrasa</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-[#B13A2B]">{player.points}</p>
                                                <p className="text-[8px] font-bold text-gray-400 uppercase">Pontos</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </section>

                    {/* 3. HISTÓRICO DE EXECUÇÃO */}
                    <section className="bg-white rounded-[2.5rem] border border-gray-200 overflow-hidden shadow-sm h-fit">
                        <button 
                            onClick={() => toggleSection('history')}
                            className="w-full p-6 flex justify-between items-center bg-gray-50/50 border-b border-gray-100"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                                    <HistoryIcon className="w-4 h-4" />
                                </div>
                                <h3 className="font-black text-xs uppercase tracking-widest text-gray-700">Histórico Recente</h3>
                            </div>
                            {openSections.history ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </button>
                        {openSections.history && (
                            <div className="p-6 space-y-3">
                                {loading ? (
                                    <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
                                ) : history.length === 0 ? (
                                    <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-3xl">
                                        <CalendarDays className="w-8 h-8 mx-auto text-gray-200 mb-2" />
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nenhuma execução hoje</p>
                                    </div>
                                ) : (
                                    history.map(session => (
                                        <Link 
                                            key={session.id}
                                            href={`/dashboard/admin/checklists/${session.id}`}
                                            className="block p-4 rounded-3xl border border-gray-50 bg-gray-50/30 hover:border-[#B13A2B]/20 hover:bg-white transition-all group"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-[8px] font-black text-[#B13A2B] uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded-full">
                                                            {session.checklist_templates?.context === 'opening' ? 'Abertura' : 'Fechamento'}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1">
                                                            <Clock className="w-2.5 h-2.5" />
                                                            {format(new Date(session.completed_at), "HH:mm", { locale: ptBR })}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-sm font-black text-gray-900 truncate group-hover:text-[#B13A2B]">{session.checklist_templates?.name}</h4>
                                                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-500">
                                                        <User className="w-3 h-3" />
                                                        <span className="truncate">{session.users?.name}</span>
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#B13A2B] group-hover:translate-x-0.5 transition-all mt-1" />
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        )}
                    </section>
                </div>

            </div>
        </div>
    )
}
