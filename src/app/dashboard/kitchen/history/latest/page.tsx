'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
    Loader2, ArrowLeft, CheckCircle2, Clock, 
    Calendar, ChevronRight, History, ClipboardList,
    AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getLatestKitchenRoundAction } from '@/app/actions/kitchenHistoryAction'

export default function LatestKitchenRoundPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [roundData, setRoundData] = useState<{ date: string, sessions: any[] } | null>(null)

    useEffect(() => {
        loadRound()
    }, [])

    const loadRound = async () => {
        setLoading(true)
        const res = await getLatestKitchenRoundAction()
        if (res.success && res.data) {
            setRoundData(res.data as any)
        } else if (res.success && !res.data) {
            setRoundData(null)
        } else {
            toast.error(res.error || 'Erro ao carregar rodada')
        }
        setLoading(false)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8F7F4] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Buscando última rodada...</p>
            </div>
        )
    }

    if (!roundData || roundData.sessions.length === 0) {
        return (
            <div className="min-h-screen bg-[#F8F7F4] flex flex-col">
                <div className="bg-white border-b border-gray-100 px-4 h-16 flex items-center gap-3 sticky top-0 z-50">
                    <button onClick={() => router.push('/dashboard/kitchen')} className="p-2 hover:bg-gray-50 rounded-xl transition">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </button>
                    <h1 className="text-sm font-black text-gray-900 uppercase">Última Rodada</h1>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-20 h-20 bg-white rounded-[32px] shadow-sm flex items-center justify-center mb-6">
                        <History className="w-10 h-10 text-gray-200" />
                    </div>
                    <h2 className="text-lg font-black text-gray-900 mb-2">Nenhuma contagem finalizada</h2>
                    <p className="text-sm text-gray-500 font-medium max-w-xs mx-auto mb-8">
                        Ainda não existem registros de contagem finalizada para a Cozinha Central.
                    </p>
                    <button 
                        onClick={() => router.push('/dashboard/kitchen/count')}
                        className="h-14 px-8 bg-orange-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-orange-200 active:scale-95 transition-all"
                    >
                        Iniciar Contagem
                    </button>
                </div>
            </div>
        )
    }

    // Formatar data: DD/MM/YYYY
    const displayDate = roundData.date.split('-').reverse().join('/')

    return (
        <div className="min-h-screen bg-[#F8F7F4] flex flex-col pb-10">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-4 h-16 flex items-center gap-3 sticky top-0 z-50">
                <button onClick={() => router.push('/dashboard/kitchen')} className="p-2 hover:bg-gray-50 rounded-xl transition">
                    <ArrowLeft className="w-5 h-5 text-gray-400" />
                </button>
                <div>
                    <h1 className="text-sm font-black text-gray-900 tracking-tight uppercase">Última Rodada CK</h1>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Visão completa da operação</p>
                </div>
            </div>

            <div className="p-4 space-y-6">
                {/* Resumo da Rodada */}
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                        <ClipboardList className="w-32 h-32" />
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-black text-gray-900">{displayDate}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-2xl">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Categorias</p>
                            <p className="text-xl font-black text-gray-900">{roundData.sessions.length}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-2xl">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Auditoria</p>
                            <p className="text-sm font-black text-amber-600">
                                {roundData.sessions.some(s => s.validation_status === 'pending') ? 'Pendente' : 'Concluída'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Lista de Categorias */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3 px-2 mb-1">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categorias Contadas</h2>
                        <div className="h-px flex-1 bg-gray-200/50" />
                    </div>

                    {roundData.sessions.map((s) => (
                        <button 
                            key={s.id} 
                            onClick={() => router.push(`/dashboard/kitchen/history/${s.id}`)}
                            className="w-full bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all hover:border-orange-200 text-left group"
                        >
                            <div className="flex items-center gap-4 min-w-0">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                                    s.validation_status === 'validated' ? 'bg-emerald-50 text-emerald-600' :
                                    s.validation_status === 'corrected' ? 'bg-amber-50 text-amber-600' :
                                    'bg-orange-50 text-orange-600'
                                }`}>
                                    {s.validation_status === 'validated' ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base font-black text-gray-900 leading-tight uppercase truncate">
                                        {s.groups?.name?.replace('CK — ', '')}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            {new Date(s.completed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span className="text-gray-200">•</span>
                                        <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">
                                            {s.users?.name?.split(' ')[0] || 'Cozinha'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 shrink-0 ml-4">
                                <div className="flex flex-col items-end">
                                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${
                                        s.validation_status === 'validated' ? 'bg-emerald-100 text-emerald-700' :
                                        s.validation_status === 'corrected' ? 'bg-amber-100 text-amber-700' :
                                        'bg-blue-100 text-blue-700'
                                    }`}>
                                        {s.validation_status === 'validated' ? 'Validada' : 
                                         s.validation_status === 'corrected' ? 'Corrigida' : 'Finalizada'}
                                    </span>
                                    {s.validation_status === 'pending' && (
                                        <span className="text-[8px] font-bold text-amber-500 uppercase mt-1">Auditoria pendente</span>
                                    )}
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-orange-400 transition-colors" />
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
