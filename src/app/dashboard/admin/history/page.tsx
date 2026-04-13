'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, History, CheckCircle2, Clock, AlertCircle, Search, Filter } from 'lucide-react'

type Execution = {
    execution_id: string
    routine_id: string
    routine_name: string
    started_at: string
    closed_at: string | null
    status: string
    started_by_name: string | null
    total_sessions: number
    completed_sessions: number
    audit_report_id: string | null
    status_approval: string | null
    divergence_value: number | null
    accuracy_percentage: number | null
    approved_at: string | null
    approved_by_name: string | null
}

export default function HistoryPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [executions, setExecutions] = useState<Execution[]>([])
    const [routines, setRoutines] = useState<{ id: string, name: string }[]>([])
    const [filterRoutine, setFilterRoutine] = useState('')
    const [filterFrom, setFilterFrom] = useState('')
    const [filterTo, setFilterTo] = useState('')

    useEffect(() => {
        loadRoutines()
        loadHistory()
    }, [])

    const loadRoutines = async () => {
        const { data } = await supabase.from('routines').select('id, name').order('name')
        if (data) setRoutines(data)
    }

    const loadHistory = async () => {
        setLoading(true)
        let query = supabase.from('v_routine_execution_history').select('*')
        if (filterRoutine) query = query.eq('routine_id', filterRoutine)
        if (filterFrom) query = query.gte('started_at', `${filterFrom}T00:00:00Z`)
        if (filterTo) query = query.lte('started_at', `${filterTo}T23:59:59Z`)
        query = query.order('started_at', { ascending: false }).limit(50)
        const { data } = await query
        if (data) setExecutions(data)
        setLoading(false)
    }

    const formatDate = (d: string | null) => {
        if (!d) return '—'
        return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    }

    const formatMoney = (v: number | null) => {
        if (v === null || v === undefined) return '—'
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
    }

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center space-x-3 mb-4 mt-2">
                <button onClick={() => router.push('/dashboard')} className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Gerencial</p>
                    <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Histórico de Ciclos</h2>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1"><Filter className="w-3.5 h-3.5" /> Filtros</p>
                <select value={filterRoutine} onChange={e => setFilterRoutine(e.target.value)} className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl text-sm text-gray-800 outline-none focus:ring-2 focus:ring-indigo-400">
                    <option value="">Todas as rotinas</option>
                    {routines.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-xs font-semibold text-gray-500">De</label>
                        <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="w-full border border-gray-200 bg-gray-50 p-2.5 rounded-xl text-sm text-gray-800 outline-none mt-1" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-500">Até</label>
                        <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="w-full border border-gray-200 bg-gray-50 p-2.5 rounded-xl text-sm text-gray-800 outline-none mt-1" />
                    </div>
                </div>
                <button onClick={loadHistory} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 transition active:scale-95">
                    <Search className="w-4 h-4" /> Buscar
                </button>
            </div>

            {loading && <div className="flex justify-center p-8"><Loader2 className="animate-spin text-indigo-600 w-6 h-6" /></div>}

            {!loading && executions.length === 0 && (
                <div className="text-center p-10 text-gray-400 font-medium">
                    <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    Nenhum ciclo encontrado para os filtros aplicados.<br />
                    <span className="text-xs">Ciclos novos aparecem aqui após a migração de schema.</span>
                </div>
            )}

            {!loading && executions.map(ex => {
                const isApproved = ex.status_approval === 'approved'
                const isPending = ex.status_approval === 'pending'
                const allDone = ex.completed_sessions >= ex.total_sessions && ex.total_sessions > 0

                return (
                    <button
                        key={ex.execution_id}
                        onClick={() => router.push(`/dashboard/admin/history/${ex.execution_id}`)}
                        className="w-full bg-white p-4 rounded-2xl border border-gray-200 shadow-sm text-left hover:border-indigo-300 hover:shadow-md transition-all"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-bold text-gray-900">{ex.routine_name}</h3>
                                <p className="text-xs text-gray-400 mt-0.5">{formatDate(ex.started_at)}</p>
                            </div>
                            {isApproved ? (
                                <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-md">Aprovado</span>
                            ) : isPending ? (
                                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-md">Pendente</span>
                            ) : allDone ? (
                                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-md">Concluído</span>
                            ) : (
                                <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2.5 py-1 rounded-md">Em andamento</span>
                            )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center mt-3 pt-3 border-t border-gray-50">
                            <div>
                                <p className="text-xs text-gray-400">Grupos</p>
                                <p className="text-sm font-bold text-gray-800">{ex.completed_sessions}/{ex.total_sessions}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Acurácia</p>
                                <p className={`text-sm font-bold ${ex.accuracy_percentage !== null ? (ex.accuracy_percentage >= 95 ? 'text-green-600' : 'text-amber-600') : 'text-gray-400'}`}>
                                    {ex.accuracy_percentage !== null ? `${ex.accuracy_percentage.toFixed(1)}%` : '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Divergência</p>
                                <p className={`text-sm font-bold ${ex.divergence_value !== null && ex.divergence_value !== 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                    {formatMoney(ex.divergence_value)}
                                </p>
                            </div>
                        </div>
                        {ex.started_by_name && (
                            <p className="text-xs text-gray-400 mt-2">Iniciado por <span className="font-semibold text-gray-600">{ex.started_by_name}</span></p>
                        )}
                    </button>
                )
            })}
        </div>
    )
}
