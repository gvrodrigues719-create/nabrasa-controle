'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft, Search, Download, RefreshCw, Filter,
    CheckCircle2, Clock, AlertTriangle, BarChart3,
    ChevronRight, User, MapPin, Calendar, Loader2
} from 'lucide-react'
import * as XLSX from 'xlsx'

// ─── Types ────────────────────────────────────────────────────────────────────

type CountSession = {
    id: string
    status: string
    started_at: string
    completed_at: string | null
    updated_at: string
    user_id: string
    group_id: string
    routine_id: string
    group_name: string
    macro_sector: string
    user_name: string
    routine_name: string
    total_items: number
    counted_items: number
    zeroed_items: number
    pending_items: number
    is_stuck: boolean
    duration_min: number | null
}

type FilterGroup = { id: string; name: string }
type FilterUser = { id: string; name: string }

type Filters = {
    from: string
    to: string
    groupId: string
    status: string
    userId: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today() {
    return new Date().toISOString().split('T')[0]
}
function daysAgo(n: number) {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return d.toISOString().split('T')[0]
}
function formatDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit'
    })
}
function formatDuration(min: number | null) {
    if (min === null) return '—'
    if (min < 60) return `${min}min`
    return `${Math.floor(min / 60)}h ${min % 60}min`
}
function statusLabel(s: CountSession) {
    if (s.is_stuck) return { label: 'Travada', color: 'bg-orange-100 text-orange-700', icon: '⚠️' }
    if (s.status === 'completed') return { label: 'Concluída', color: 'bg-green-100 text-green-700', icon: '✅' }
    return { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700', icon: '🔄' }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CountHistoryPage() {
    const router = useRouter()

    const [sessions, setSessions] = useState<CountSession[]>([])
    const [loading, setLoading] = useState(false)
    const [exportLoading, setExportLoading] = useState(false)
    const [exportError, setExportError] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [showFilters, setShowFilters] = useState(true)

    // Filter options
    const [groups, setGroups] = useState<FilterGroup[]>([])
    const [users, setUsers] = useState<FilterUser[]>([])

    const [filters, setFilters] = useState<Filters>({
        from: daysAgo(7),
        to: today(),
        groupId: '',
        status: 'all',
        userId: '',
    })

    // Load groups and users for filter dropdowns (one-time)
    useEffect(() => {
        fetch('/api/admin/sessions')
            .then(r => r.json())
            .then(({ sessions: all }) => {
                if (!all) return
                const gMap = new Map<string, string>()
                const uMap = new Map<string, string>()
                all.forEach((s: any) => {
                    if (s.group_id && s.group_name) gMap.set(s.group_id, s.group_name)
                    if (s.user_id && s.user_name) uMap.set(s.user_id, s.user_name)
                })
                setGroups(Array.from(gMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)))
                setUsers(Array.from(uMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)))
            })
            .catch(() => {})
        // Load initial data
        fetchHistory({ from: daysAgo(7), to: today(), groupId: '', status: 'all', userId: '' })
    }, [])

    const fetchHistory = useCallback(async (f: Filters) => {
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams()
            if (f.from) params.set('from', f.from)
            if (f.to) params.set('to', f.to)
            if (f.groupId) params.set('groupId', f.groupId)
            if (f.status && f.status !== 'all') params.set('status', f.status)
            if (f.userId) params.set('userId', f.userId)

            const res = await fetch(`/api/admin/counts/history?${params}`, { cache: 'no-store' })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error || `HTTP ${res.status}`)
            }
            const { sessions: data } = await res.json()
            setSessions(data || [])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    function applyFilters() { fetchHistory(filters) }
    function clearFilters() {
        const reset: Filters = { from: daysAgo(7), to: today(), groupId: '', status: 'all', userId: '' }
        setFilters(reset)
        fetchHistory(reset)
    }
    function setPeriod(from: string, to: string) {
        const f = { ...filters, from, to }
        setFilters(f)
        fetchHistory(f)
    }

    // ── Summary stats ─────────────────────────────────────────────────────────
    const total = sessions.length
    const completed = sessions.filter(s => s.status === 'completed').length
    const inProgress = sessions.filter(s => s.status !== 'completed' && !s.is_stuck).length
    const stuck = sessions.filter(s => s.is_stuck).length

    // ── Export XLSX (2 abas: Resumo + Itens Contados) ────────────────────────
    async function exportDetailedXLSX() {
        setExportLoading(true)
        setExportError(null)
        try {
            const params = new URLSearchParams()
            if (filters.from) params.set('from', filters.from)
            if (filters.to) params.set('to', filters.to)
            if (filters.groupId) params.set('groupId', filters.groupId)
            if (filters.status && filters.status !== 'all') params.set('status', filters.status)
            if (filters.userId) params.set('userId', filters.userId)

            const res = await fetch(`/api/admin/counts/history/export?${params}`, { cache: 'no-store' })
            if (!res.ok) throw new Error(`Erro HTTP ${res.status}`)
            const { sessions: exportSessions, items: exportItems } = await res.json()

            const wb = XLSX.utils.book_new()

            // ── ABA 1: Resumo ────────────────────────────────────────────────
            const summaryRows = (exportSessions || []).map((s: any) => ({
                'Data': formatDate(s.started_at),
                'Grupo / Área': s.group_name,
                'Setor': s.macro_sector,
                'Responsável': s.user_name,
                'Rotina': s.routine_name,
                'Status': s.is_stuck ? 'Travada' : s.status === 'completed' ? 'Concluída' : 'Em Andamento',
                'Total Itens': s.total_items,
                'Contados': s.counted_items,
                'Zerados': s.zeroed_items,
                'Pendentes': s.pending_items,
                'Início': formatDate(s.started_at),
                'Conclusão': formatDate(s.completed_at),
                'Duração': formatDuration(s.duration_min),
            }))
            const ws1 = XLSX.utils.json_to_sheet(summaryRows)
            ws1['!cols'] = [14,22,14,18,20,12,10,10,10,10,16,16,10].map(w => ({ wch: w }))
            ws1['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: summaryRows.length, c: 12 } }) }
            ws1['!freeze'] = { xSplit: 0, ySplit: 1 }
            XLSX.utils.book_append_sheet(wb, ws1, 'Resumo')

            // ── ABA 2: Itens Contados ────────────────────────────────────────
            const itemRows = (exportItems || []).map((i: any) => ({
                'Data da Contagem': formatDate(i.started_at),
                'Grupo / Área': i.group_name,
                'Setor': i.macro_sector,
                'Responsável': i.user_name,
                'Rotina': i.routine_name,
                'Status da Sessão': i.session_status === 'completed' ? 'Concluída' : 'Em Andamento',
                'Item': i.item_name,
                'Unidade': i.item_unit,
                'Categoria': i.item_category,
                'Quantidade Contada': i.counted_quantity ?? '',
                'Zerado?': i.is_zeroed ? 'Sim' : 'Não',
                'Quantidade Para Análise': i.quantity_for_analysis ?? '',
                'Início': formatDate(i.started_at),
                'Conclusão': formatDate(i.completed_at),
                'Item ID': i.item_id,
                'Session ID': i.session_id,
            }))
            const ws2 = XLSX.utils.json_to_sheet(itemRows)
            ws2['!cols'] = [16,22,14,18,20,14,28,10,16,16,10,18,16,16,14,14].map(w => ({ wch: w }))
            ws2['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(itemRows.length, 1), c: 15 } }) }
            ws2['!freeze'] = { xSplit: 0, ySplit: 1 }
            XLSX.utils.book_append_sheet(wb, ws2, 'Itens Contados')

            const filename = `contagens_nabrasa_${filters.from}_a_${filters.to}.xlsx`
            XLSX.writeFile(wb, filename)
        } catch (err: any) {
            setExportError('Não foi possível gerar o Excel. Tente novamente.')
            console.error('[Export XLSX]', err)
        } finally {
            setExportLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* ── Header ──────────────────────────────────────────────────────── */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <button onClick={() => router.push('/dashboard/admin')}
                            className="p-2 bg-gray-50 rounded-xl text-gray-600 hover:bg-gray-100 transition">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">Histórico de Contagens</h1>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Conferência & Auditoria</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => fetchHistory(filters)} disabled={loading}
                            className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition disabled:opacity-50">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={exportDetailedXLSX}
                            disabled={sessions.length === 0 || exportLoading}
                            className="flex items-center space-x-1.5 px-3 py-2.5 bg-green-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-green-700 transition disabled:opacity-40"
                        >
                            {exportLoading
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Download className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">{exportLoading ? 'Gerando...' : 'Exportar Excel'}</span>
                        </button>
                        <button onClick={() => setShowFilters(v => !v)}
                            className={`p-2.5 rounded-xl transition ${showFilters ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* ── Period Shortcuts ─────────────────────────────────────────── */}
                <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-hide">
                    {[
                        { label: 'Hoje', from: today(), to: today() },
                        { label: 'Ontem', from: daysAgo(1), to: daysAgo(1) },
                        { label: '7 dias', from: daysAgo(7), to: today() },
                        { label: '30 dias', from: daysAgo(30), to: today() },
                    ].map(p => (
                        <button key={p.label}
                            onClick={() => setPeriod(p.from, p.to)}
                            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition ${
                                filters.from === p.from && filters.to === p.to
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                    : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'
                            }`}
                        >{p.label}</button>
                    ))}
                </div>

                {/* ── Filters Panel ────────────────────────────────────────────── */}
                {showFilters && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">De</label>
                                <input type="date" value={filters.from}
                                    onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Até</label>
                                <input type="date" value={filters.to}
                                    onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Grupo / Área</label>
                            <select value={filters.groupId}
                                onChange={e => setFilters(f => ({ ...f, groupId: e.target.value }))}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white">
                                <option value="">Todos os grupos</option>
                                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Status</label>
                                <select value={filters.status}
                                    onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white">
                                    <option value="all">Todos</option>
                                    <option value="completed">Concluída</option>
                                    <option value="in_progress">Em Andamento</option>
                                    <option value="stuck">Travada ⚠️</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Responsável</label>
                                <select value={filters.userId}
                                    onChange={e => setFilters(f => ({ ...f, userId: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white">
                                    <option value="">Todos</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="flex space-x-2 pt-1">
                            <button onClick={applyFilters}
                                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition">
                                Aplicar Filtros
                            </button>
                            <button onClick={clearFilters}
                                className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition">
                                Limpar
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Summary Cards ────────────────────────────────────────────── */}
                {!loading && sessions.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { label: 'Total', value: total, color: 'bg-gray-900', text: 'text-white', icon: <BarChart3 className="w-4 h-4" /> },
                            { label: 'Concluídas', value: completed, color: 'bg-green-500', text: 'text-white', icon: <CheckCircle2 className="w-4 h-4" /> },
                            { label: 'Em Andamento', value: inProgress, color: 'bg-blue-500', text: 'text-white', icon: <Clock className="w-4 h-4" /> },
                            { label: 'Travadas', value: stuck, color: stuck > 0 ? 'bg-orange-500' : 'bg-gray-200', text: stuck > 0 ? 'text-white' : 'text-gray-400', icon: <AlertTriangle className="w-4 h-4" /> },
                        ].map(c => (
                            <div key={c.label} className={`${c.color} rounded-2xl p-3 text-center`}>
                                <div className={`${c.text} flex justify-center mb-1 opacity-80`}>{c.icon}</div>
                                <p className={`text-xl font-black ${c.text}`}>{c.value}</p>
                                <p className={`text-[9px] font-bold uppercase tracking-widest ${c.text} opacity-70 leading-tight`}>{c.label}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Error ────────────────────────────────────────────────────── */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-700 font-medium">
                        ❌ {error}
                    </div>
                )}
                {exportError && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-700 font-medium flex items-center justify-between">
                        <span>❌ {exportError}</span>
                        <button onClick={() => setExportError(null)} className="text-red-400 hover:text-red-600 font-black ml-3">✕</button>
                    </div>
                )}

                {/* ── Loading ──────────────────────────────────────────────────── */}
                {loading && (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    </div>
                )}

                {/* ── Empty ────────────────────────────────────────────────────── */}
                {!loading && !error && sessions.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-[28px] border border-dashed border-gray-200">
                        <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">Nenhuma contagem encontrada</p>
                        <p className="text-gray-400 text-sm mt-1">Ajuste os filtros e tente novamente</p>
                    </div>
                )}

                {/* ── Sessions List ─────────────────────────────────────────────── */}
                {!loading && sessions.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                            {sessions.length} contagem{sessions.length !== 1 ? 's' : ''} encontrada{sessions.length !== 1 ? 's' : ''}
                        </p>

                        {sessions.map(session => {
                            const badge = statusLabel(session)
                            const progress = session.total_items > 0
                                ? Math.round(((session.counted_items + session.zeroed_items) / session.total_items) * 100)
                                : 0

                            return (
                                <div key={session.id}
                                    className={`bg-white rounded-[24px] border shadow-sm overflow-hidden ${
                                        session.is_stuck ? 'border-orange-200' : 'border-gray-100'
                                    }`}>
                                    {session.is_stuck && (
                                        <div className="bg-orange-500 px-4 py-1.5 flex items-center space-x-2">
                                            <AlertTriangle className="w-3.5 h-3.5 text-white" />
                                            <span className="text-white text-[10px] font-black uppercase tracking-widest">
                                                Possível Travamento — Em aberto há mais de 8h
                                            </span>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => router.push(`/dashboard/admin/history/session/${session.id}`)}
                                        className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                                                    <MapPin className="w-5 h-5 text-indigo-600" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-black text-gray-900 text-sm leading-tight truncate">{session.group_name}</p>
                                                    {session.macro_sector && (
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{session.macro_sector}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2 shrink-0 ml-2">
                                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${badge.color}`}>
                                                    {badge.label}
                                                </span>
                                                <ChevronRight className="w-4 h-4 text-gray-300" />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                                            <div className="flex items-center space-x-1">
                                                <User className="w-3.5 h-3.5" />
                                                <span className="font-medium">{session.user_name.split(' ')[0]}</span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span>{formatDate(session.started_at)}</span>
                                            </div>
                                            <span className="font-medium">{formatDuration(session.duration_min)}</span>
                                        </div>

                                        {session.total_items > 0 && (
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                    <span>{session.counted_items + session.zeroed_items} / {session.total_items} itens</span>
                                                    <span>{progress}%</span>
                                                </div>
                                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${
                                                            progress === 100 ? 'bg-green-500' :
                                                            session.is_stuck ? 'bg-orange-400' : 'bg-indigo-500'
                                                        }`}
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
