'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
    Loader2, ArrowLeft, Search, Filter, CheckCircle2, Clock, 
    Calendar, ChevronRight, History, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getKitchenSessionHistoryAction } from '@/app/actions/kitchenHistoryAction'

export default function KitchenHistoryPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [sessions, setSessions] = useState<any[]>([])
    const [filterDate, setFilterDate] = useState(new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date()))
    
    useEffect(() => {
        loadSessions()
    }, [filterDate])

    const loadSessions = async () => {
        setLoading(true)
        const res = await getKitchenSessionHistoryAction({ date: filterDate })
        if (res.success) {
            setSessions(res.data || [])
        } else {
            toast.error(res.error || 'Erro ao carregar histórico')
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-[#F8F7F4] flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-4 h-16 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push('/dashboard/kitchen')} className="p-2 hover:bg-gray-50 rounded-xl transition">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </button>
                    <div>
                        <h1 className="text-sm font-black text-gray-900 tracking-tight uppercase">Histórico Cozinha</h1>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Contagens finalizadas</p>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Filtro de Data */}
                <div className="bg-white p-4 rounded-[24px] border border-gray-100 shadow-sm">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-1 block mb-2">Filtrar por Data</label>
                    <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
                        <input 
                            type="date" 
                            value={filterDate} 
                            onChange={e => setFilterDate(e.target.value)} 
                            className="w-full h-12 pl-11 pr-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all" 
                        />
                    </div>
                </div>

                {/* Lista */}
                <div className="space-y-3">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Buscando registros...</p>
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-[32px] border border-dashed border-gray-200">
                            <History className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nenhuma contagem encontrada</p>
                        </div>
                    ) : (
                        sessions.map(s => (
                            <div 
                                key={s.id} 
                                onClick={() => router.push(`/dashboard/kitchen/history/${s.id}`)}
                                className="bg-white p-4 rounded-[24px] border border-gray-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all hover:border-orange-200"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                                        s.validation_status === 'validated' ? 'bg-emerald-50 text-emerald-600' :
                                        s.validation_status === 'corrected' ? 'bg-amber-50 text-amber-600' :
                                        'bg-gray-50 text-gray-400'
                                    }`}>
                                        {s.validation_status === 'validated' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-gray-900 leading-tight uppercase">{s.groups?.name?.replace('CK — ', '')}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                                {new Date(s.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <span className="text-gray-200">•</span>
                                            <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest">{s.users?.name?.split(' ')[0]}</span>
                                            {s.status === 'in_progress' && (
                                                <>
                                                    <span className="text-gray-200">•</span>
                                                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Em andamento</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${
                                        s.validation_status === 'validated' ? 'bg-emerald-100 text-emerald-700' :
                                        s.validation_status === 'corrected' ? 'bg-amber-100 text-amber-700' :
                                        'bg-gray-100 text-gray-400'
                                    }`}>
                                        {s.validation_status === 'validated' ? 'Validada' : s.validation_status === 'corrected' ? 'Corrigida' : 'Pendente'}
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-gray-300" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
