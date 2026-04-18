"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
    getAllChecklistSessionsAction 
} from '@/app/actions/checklistAction'
import { 
    getWeeklyRankingAction 
} from '@/app/actions/gamificationAction'
import { 
    ClipboardCheck, 
    Trophy, 
    ChevronRight, 
    Clock, 
    User, 
    Calendar,
    ArrowLeft,
    Loader2,
    CalendarDays,
    Settings2
} from 'lucide-react'
import AdminChecklistManager from './AdminChecklistManager'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function AdminAuditPage() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'history' | 'ranking' | 'management'>('history')
    const [history, setHistory] = useState<any[]>([])
    const [ranking, setRanking] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [activeTab])

    const fetchData = async () => {
        setLoading(true)
        if (activeTab === 'history') {
            const res = await getAllChecklistSessionsAction()
            if (res.success) setHistory(res.data || [])
        } else {
            // No admin, não temos o userId atual (ou usamos o logado apenas para preencher o contrato)
            // Mas a action de ranking retorna o top 5 global
            const res = await getWeeklyRankingAction('')
            if (res.success) setRanking(res.top5 || [])
        }
        setLoading(false)
    }

    return (
        <div className="pb-10">
            {/* HEADER */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-4 md:px-6 mb-6">
                <div className="flex items-center gap-4 max-w-4xl mx-auto">
                    <button 
                        onClick={() => router.push('/dashboard/admin')}
                        className="p-2 hover:bg-gray-100 rounded-xl transition"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Auditoria & Performance</h1>
                        <p className="text-xs text-gray-500 font-medium">Gestão operacional de checklists e equipe</p>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-5">
                {/* TABS */}
                <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-8">
                    <button 
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                            activeTab === 'history' 
                                ? 'bg-white text-[#B13A2B] shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <ClipboardCheck className="w-4 h-4" />
                        Histórico
                    </button>
                    <button 
                        onClick={() => setActiveTab('ranking')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                            activeTab === 'ranking' 
                                ? 'bg-white text-[#B13A2B] shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <Trophy className="w-4 h-4" />
                        Ranking
                    </button>
                    <button 
                        onClick={() => setActiveTab('management')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                            activeTab === 'management' 
                                ? 'bg-white text-[#B13A2B] shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <Settings2 className="w-4 h-4" />
                        Gestão
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-[#B13A2B] animate-spin mb-3" />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Carregando dados...</p>
                    </div>
                ) : activeTab === 'history' ? (
                    <div className="space-y-4">
                        {history.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-3xl border border-gray-200 border-dashed">
                                <CalendarDays className="w-12 h-12 mx-auto text-gray-200 mb-4" />
                                <p className="font-bold text-gray-400 uppercase tracking-widest text-xs">Nenhum checklist concluído ainda</p>
                            </div>
                        ) : (
                            history.map(session => (
                                <Link 
                                    key={session.id}
                                    href={`/dashboard/admin/checklists/${session.id}`}
                                    className="block bg-white border border-gray-200 p-5 rounded-3xl hover:border-[#B13A2B]/30 transition-all group shadow-sm active:scale-[0.99]"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-[10px] font-black text-[#B13A2B] uppercase tracking-widest bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
                                                    {session.checklist_templates?.context === 'opening' ? 'Abertura' : 'Fechamento'}
                                                </span>
                                                <div className="flex items-center gap-1.5 text-[#8c716c] text-[10px] font-bold">
                                                    <Clock className="w-3 h-3" />
                                                    {format(new Date(session.completed_at), "HH:mm '·' d 'de' MMM", { locale: ptBR })}
                                                </div>
                                            </div>
                                            <h3 className="text-lg font-black text-gray-900 group-hover:text-[#B13A2B] transition-colors">{session.checklist_templates?.name}</h3>
                                            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 font-medium">
                                                <User className="w-4 h-4" />
                                                <span>Realizado por: <strong className="text-gray-700">{session.users?.name}</strong></span>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 p-2 rounded-xl border border-gray-100 group-hover:bg-[#B13A2B] group-hover:text-white transition-all">
                                            <ChevronRight className="w-5 h-5" />
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                ) : activeTab === 'ranking' ? (
                    <div className="space-y-4">
                        <div className="bg-[#1b1c1a] rounded-[32px] p-8 shadow-xl relative overflow-hidden mb-8">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-600 opacity-10 rounded-full -mr-16 -mt-16" />
                            <h2 className="text-white text-xl font-extrabold mb-1">Top 5 Colaboradores</h2>
                            <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Ranking Semanal de Performance</p>
                        </div>

                        {ranking.map((player, idx) => (
                            <div key={player.userId} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between hover:border-amber-200 transition-all">
                                <div className="flex items-center space-x-4">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg ${
                                        idx === 0 ? 'bg-amber-100 text-amber-600' : 
                                        idx === 1 ? 'bg-gray-100 text-gray-600' : 
                                        idx === 2 ? 'bg-orange-100 text-orange-700' : 
                                        'bg-gray-50 text-gray-400'
                                    }`}>
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">{player.name}</h4>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Colaborador NaBrasa</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xl font-black text-[#B13A2B] block">{player.points}</span>
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Pontos na semana</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <AdminChecklistManager />
                )}
            </div>
        </div>
    )
}
