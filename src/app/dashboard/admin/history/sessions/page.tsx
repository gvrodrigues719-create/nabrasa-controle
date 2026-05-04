'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, Clock, User, MapPin, ChevronRight, AlertCircle, Search } from 'lucide-react'

type Session = {
    id: string
    status: string
    started_at: string
    completed_at: string | null
    user_id: string
    group_id: string
    routine_id: string
    group_name?: string
    user_name?: string
}

export default function RawSessionsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [sessions, setSessions] = useState<Session[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [fetchError, setFetchError] = useState<string | null>(null)

    useEffect(() => {
        loadSessions()
    }, [])

    const loadSessions = async () => {
        setLoading(true)
        setFetchError(null)

        try {
            // USA API SERVER-SIDE com service role key para ignorar RLS
            // Isso garante que TODOS os dispositivos (celular, computador) vejam os dados
            const response = await fetch('/api/admin/sessions', {
                cache: 'no-store',
                headers: { 'Content-Type': 'application/json' }
            })

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}))
                throw new Error(errData.error || `Erro HTTP ${response.status}`)
            }

            const { sessions: data } = await response.json()
            setSessions(data || [])
        } catch (err: any) {
            console.error('[RawSessions] Erro fatal:', err)
            setFetchError(err.message || 'Erro desconhecido ao carregar sessões')
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (d: string | null) => {
        if (!d) return '—'
        return new Date(d).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const filtered = sessions.filter(s =>
        (s.group_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.user_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="p-4 space-y-4 pb-20">
            <div className="flex items-center space-x-3 mb-4 mt-2">
                <button onClick={() => router.push('/dashboard/admin/reports')} className="p-2 bg-white rounded-xl shadow-sm border border-gray-200 text-gray-600">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <div className="flex items-center space-x-2">
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">Auditoria Master</h2>
                        <span className="text-[10px] font-bold text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded">v1.0.7</span>
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tempo Real & Histórico</p>
                </div>
                <button
                    onClick={loadSessions}
                    disabled={loading}
                    className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 active:scale-90 transition-all disabled:opacity-50"
                >
                    <Clock className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Buscar por local ou operador..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                />
            </div>

            {fetchError && (
                <div className="p-6 bg-red-50 border border-red-100 rounded-2xl space-y-3">
                    <div className="flex items-center space-x-2 text-red-600 font-bold uppercase text-[10px] tracking-widest">
                        <AlertCircle className="w-4 h-4" />
                        <span>Erro de Sincronização</span>
                    </div>
                    <p className="text-sm text-red-800 font-medium">{fetchError}</p>
                    <button onClick={loadSessions} className="px-4 py-2 bg-red-600 text-white text-xs font-black rounded-lg uppercase tracking-widest">Tentar Novamente</button>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 space-y-4">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Carregando sessões...</p>
                </div>
            ) : filtered.length === 0 && !fetchError ? (
                <div className="text-center p-20 bg-white rounded-[32px] border border-dashed border-gray-200">
                    <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium text-sm">Nenhuma contagem encontrada no momento.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(session => (
                        <button
                            key={session.id}
                            onClick={() => router.push(`/dashboard/admin/history/session/${session.id}`)}
                            className="w-full bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm text-left hover:border-indigo-200 hover:shadow-md transition-all group flex items-center justify-between"
                        >
                            <div className="space-y-3 flex-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                            <MapPin className="w-4 h-4 text-indigo-600" />
                                        </div>
                                        <span className="font-black text-gray-900">{session.group_name}</span>
                                    </div>
                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                        session.status === 'completed'
                                            ? 'bg-green-50 text-green-600'
                                            : 'bg-amber-50 text-amber-600 animate-pulse'
                                    }`}>
                                        {session.status === 'completed' ? 'Finalizada' : 'Em Aberto'}
                                    </span>
                                </div>

                                <div className="flex items-center space-x-6 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    <div className="flex items-center space-x-1.5">
                                        <User className="w-3.5 h-3.5" />
                                        <span>{(session.user_name || '').split(' ')[0]}</span>
                                    </div>
                                    <div className="flex items-center space-x-1.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>{formatDate(session.started_at)}</span>
                                    </div>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all ml-4" />
                        </button>
                    ))}
                </div>
            )}

            {!loading && !fetchError && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-gray-900 text-white rounded-full shadow-2xl text-[10px] font-black uppercase tracking-widest z-50">
                    Total de {filtered.length} sessões encontradas
                </div>
            )}
        </div>
    )
}
