'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft,
    Plus,
    ChevronLeft,
    ChevronRight,
    Trash2,
    X,
    Search,
    CheckCircle2,
    Factory,
    Clock,
    AlertCircle,
    ChevronDown,
} from 'lucide-react'
import {
    getProductionLogsAction,
    createProductionLogAction,
    deleteProductionLogAction,
    searchProducedItemsAction,
} from '@/modules/kitchen/production-actions'
import type { ProductionLog, ProducedItemSuggestion } from '@/modules/kitchen/production-actions'
import toast from 'react-hot-toast'

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
}

function todayISO() {
    return new Date().toISOString().split('T')[0]
}

function nowTime() {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function addDays(dateStr: string, days: number) {
    const d = new Date(dateStr + 'T12:00:00Z')
    d.setUTCDate(d.getUTCDate() + days)
    return d.toISOString().split('T')[0]
}

function isToday(dateStr: string) {
    return dateStr === todayISO()
}

const UNIT_OPTIONS = ['UN', 'KG', 'G', 'L', 'ML', 'CX', 'PCT', 'BALDE', 'SACO', 'BISNAGA', 'PORÇÃO']

// ─── Form state ────────────────────────────────────────────────────────────

interface FormState {
    product_name: string
    purchase_item_id: string
    quantity: string
    unit: string
    produced_at: string
    produced_time: string
    responsible: string
    notes: string
}

const emptyForm = (): FormState => ({
    product_name: '',
    purchase_item_id: '',
    quantity: '',
    unit: 'KG',
    produced_at: todayISO(),
    produced_time: nowTime(),
    responsible: '',
    notes: '',
})

// ─── Main Component ────────────────────────────────────────────────────────

export default function ProductionPage() {
    const router = useRouter()
    const [selectedDate, setSelectedDate] = useState(todayISO())
    const [logs, setLogs] = useState<ProductionLog[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState<FormState>(emptyForm())
    const [submitting, setSubmitting] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

    // Autocomplete
    const [searchQuery, setSearchQuery] = useState('')
    const [suggestions, setSuggestions] = useState<ProducedItemSuggestion[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [searchLoading, setSearchLoading] = useState(false)
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Unit dropdown
    const [showUnitPicker, setShowUnitPicker] = useState(false)

    // ── Fetch logs ──────────────────────────────────────────────────────────

    const fetchLogs = useCallback(async (date: string) => {
        setLoading(true)
        const res = await getProductionLogsAction(date)
        if (res.success) {
            setLogs(res.data ?? [])
        } else {
            toast.error(res.error ?? 'Erro ao carregar registros')
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        fetchLogs(selectedDate)
    }, [selectedDate, fetchLogs])

    // ── Open/close form ─────────────────────────────────────────────────────

    function openForm() {
        setForm({ ...emptyForm(), produced_at: selectedDate })
        setSearchQuery('')
        setSuggestions([])
        setShowForm(true)
    }

    function closeForm() {
        setShowForm(false)
        setShowSuggestions(false)
    }

    // ── Autocomplete ────────────────────────────────────────────────────────

    function handleProductSearch(value: string) {
        setSearchQuery(value)
        setForm(f => ({ ...f, product_name: value, purchase_item_id: '' }))

        if (searchTimeout.current) clearTimeout(searchTimeout.current)
        if (!value.trim() || value.length < 2) {
            setSuggestions([])
            setShowSuggestions(false)
            return
        }

        setSearchLoading(true)
        searchTimeout.current = setTimeout(async () => {
            const res = await searchProducedItemsAction(value)
            if (res.success && res.data) {
                setSuggestions(res.data)
                setShowSuggestions(true)
            }
            setSearchLoading(false)
        }, 300)
    }

    function selectSuggestion(item: ProducedItemSuggestion) {
        setForm(f => ({
            ...f,
            product_name: item.name,
            purchase_item_id: item.id,
            unit: item.unit || f.unit,
        }))
        setSearchQuery(item.name)
        setShowSuggestions(false)
    }

    // ── Submit form ─────────────────────────────────────────────────────────

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (submitting) return

        const qty = parseFloat(form.quantity.replace(',', '.'))
        if (!form.product_name.trim()) { toast.error('Informe o produto.'); return }
        if (isNaN(qty) || qty <= 0) { toast.error('Quantidade inválida.'); return }
        if (!form.responsible.trim()) { toast.error('Informe o responsável.'); return }

        setSubmitting(true)
        const res = await createProductionLogAction({
            produced_at: form.produced_at,
            produced_time: form.produced_time || undefined,
            product_name: form.product_name,
            purchase_item_id: form.purchase_item_id || undefined,
            quantity: qty,
            unit: form.unit,
            responsible: form.responsible,
            notes: form.notes || undefined,
        })

        if (res.success) {
            toast.success('Produção registrada!')
            closeForm()
            await fetchLogs(selectedDate)
        } else {
            toast.error(res.error ?? 'Erro ao salvar.')
        }
        setSubmitting(false)
    }

    // ── Delete ──────────────────────────────────────────────────────────────

    async function handleDelete(id: string) {
        if (confirmDelete !== id) {
            setConfirmDelete(id)
            setTimeout(() => setConfirmDelete(null), 3000)
            return
        }
        setDeletingId(id)
        const res = await deleteProductionLogAction(id)
        if (res.success) {
            toast.success('Registro removido.')
            setLogs(prev => prev.filter(l => l.id !== id))
        } else {
            toast.error(res.error ?? 'Erro ao remover.')
        }
        setDeletingId(null)
        setConfirmDelete(null)
    }

    // ── Date navigation ─────────────────────────────────────────────────────

    function prevDay() { setSelectedDate(d => addDays(d, -1)) }
    function nextDay() {
        const next = addDays(selectedDate, 1)
        if (next <= todayISO()) setSelectedDate(next)
    }

    // ── Summary ─────────────────────────────────────────────────────────────

    const totalItems = logs.length
    const groupedByProduct = logs.reduce<Record<string, number>>((acc, l) => {
        acc[l.product_name] = (acc[l.product_name] || 0) + Number(l.quantity)
        return acc
    }, {})

    // ─── Render ─────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-[#F8F7F4]">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
                <div className="max-w-md lg:max-w-3xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => router.push('/dashboard/kitchen')}
                            className="p-2 hover:bg-gray-100 rounded-xl transition-colors shrink-0"
                            id="btn-back-kitchen"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-sm font-black text-gray-900 leading-none">Registro de Produção</h1>
                            <p className="text-[10px] text-gray-400 mt-0.5 font-bold uppercase tracking-wider">Cozinha Central</p>
                        </div>
                    </div>

                    {/* Date navigator */}
                    <div className="flex items-center gap-1 shrink-0 bg-gray-50 rounded-xl px-1 py-1">
                        <button
                            onClick={prevDay}
                            className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                            id="btn-prev-day"
                        >
                            <ChevronLeft className="w-4 h-4 text-gray-500" />
                        </button>
                        <div className="text-center px-2">
                            <p className="text-xs font-black text-gray-900">{formatDate(selectedDate)}</p>
                            {isToday(selectedDate) && (
                                <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Hoje</p>
                            )}
                        </div>
                        <button
                            onClick={nextDay}
                            disabled={isToday(selectedDate)}
                            className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            id="btn-next-day"
                        >
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Body ───────────────────────────────────────────────────── */}
            <div className="max-w-md lg:max-w-3xl mx-auto px-4 py-6 pb-32 space-y-6">

                {/* Summary strip */}
                {!loading && totalItems > 0 && (
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl px-5 py-4 flex items-center justify-between shadow-lg shadow-emerald-200/50">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2.5 rounded-xl">
                                <Factory className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-white font-black text-base leading-none">
                                    {totalItems} {totalItems === 1 ? 'registro' : 'registros'}
                                </p>
                                <p className="text-emerald-100 text-[10px] font-bold mt-0.5 uppercase tracking-wider">
                                    {Object.keys(groupedByProduct).length} {Object.keys(groupedByProduct).length === 1 ? 'produto' : 'produtos'} produzidos
                                </p>
                            </div>
                        </div>
                        <CheckCircle2 className="w-6 h-6 text-white/60" />
                    </div>
                )}

                {/* ── Log list ──────────────────────────────────────────── */}
                <section className="space-y-3">
                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">
                        Produção de {formatDate(selectedDate)}
                    </h2>

                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-gray-100" />
                            ))}
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 px-6 py-10 flex flex-col items-center gap-3 text-center">
                            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center">
                                <Factory className="w-7 h-7 text-gray-300" />
                            </div>
                            <div>
                                <p className="font-black text-gray-700 text-base">Nenhum registro</p>
                                <p className="text-gray-400 text-sm mt-1">
                                    {isToday(selectedDate)
                                        ? 'Registre o que foi produzido hoje.'
                                        : `Nenhuma produção registrada em ${formatDate(selectedDate)}.`}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {logs.map(log => (
                                <div
                                    key={log.id}
                                    className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex items-center gap-3"
                                >
                                    {/* Icon */}
                                    <div className="bg-emerald-50 p-2.5 rounded-xl shrink-0">
                                        <Factory className="w-5 h-5 text-emerald-600" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-gray-900 text-sm leading-tight truncate">
                                            {log.product_name}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            <span className="text-emerald-600 font-black text-xs">
                                                {Number(log.quantity).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {log.unit}
                                            </span>
                                            <span className="text-gray-300 text-xs">·</span>
                                            <span className="text-gray-500 text-xs font-medium truncate">{log.responsible}</span>
                                            {log.produced_time && (
                                                <>
                                                    <span className="text-gray-300 text-xs">·</span>
                                                    <span className="flex items-center gap-0.5 text-gray-400 text-xs">
                                                        <Clock className="w-3 h-3" />
                                                        {log.produced_time.slice(0, 5)}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        {log.notes && (
                                            <p className="text-gray-400 text-[11px] mt-1 leading-tight line-clamp-1 italic">
                                                {log.notes}
                                            </p>
                                        )}
                                    </div>

                                    {/* Delete */}
                                    <button
                                        onClick={() => handleDelete(log.id)}
                                        disabled={deletingId === log.id}
                                        className={`shrink-0 p-2 rounded-xl transition-all ${
                                            confirmDelete === log.id
                                                ? 'bg-red-100 text-red-600 scale-110'
                                                : 'hover:bg-red-50 text-gray-300 hover:text-red-400'
                                        }`}
                                        title={confirmDelete === log.id ? 'Toque novamente para confirmar' : 'Remover'}
                                        id={`btn-delete-log-${log.id}`}
                                    >
                                        {deletingId === log.id ? (
                                            <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Confirm delete hint */}
                    {confirmDelete && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 animate-pulse">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                            <p className="text-red-700 text-xs font-bold">Toque novamente na lixeira para confirmar a remoção.</p>
                        </div>
                    )}
                </section>
            </div>

            {/* ── FAB — Registrar ────────────────────────────────────────── */}
            {isToday(selectedDate) && (
                <div className="fixed bottom-6 left-0 right-0 flex justify-center z-30 pointer-events-none">
                    <button
                        onClick={openForm}
                        id="btn-open-production-form"
                        className="pointer-events-auto flex items-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-sm px-6 py-3.5 rounded-2xl shadow-xl shadow-emerald-300/50 transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        Registrar Produção
                    </button>
                </div>
            )}

            {/* ── Modal / Slide-up Form ───────────────────────────────────── */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={closeForm}
                    />

                    {/* Sheet */}
                    <div className="relative bg-white rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 bg-gray-200 rounded-full" />
                        </div>

                        {/* Sheet header */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                            <div>
                                <h2 className="font-black text-gray-900 text-base">Registrar Produção</h2>
                                <p className="text-gray-400 text-xs mt-0.5">{formatDate(form.produced_at)}</p>
                            </div>
                            <button
                                onClick={closeForm}
                                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                                id="btn-close-form"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Form body */}
                        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4 pb-8">

                            {/* Product autocomplete */}
                            <div>
                                <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-1.5">
                                    Produto *
                                </label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        {searchLoading
                                            ? <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                            : <Search className="w-4 h-4 text-gray-400" />
                                        }
                                    </div>
                                    <input
                                        id="input-product-name"
                                        type="text"
                                        value={searchQuery}
                                        onChange={e => handleProductSearch(e.target.value)}
                                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                        placeholder="Ex: Frango Grelhado, Pão de Queijo..."
                                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-400 transition-colors"
                                        autoComplete="off"
                                        required
                                    />
                                    {/* Suggestions dropdown */}
                                    {showSuggestions && suggestions.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-100 rounded-xl shadow-xl z-10 overflow-hidden max-h-48 overflow-y-auto">
                                            {suggestions.map(s => (
                                                <button
                                                    key={s.id}
                                                    type="button"
                                                    onClick={() => selectSuggestion(s)}
                                                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-emerald-50 transition-colors text-left"
                                                >
                                                    <span className="font-bold text-sm text-gray-900 truncate">{s.name}</span>
                                                    <span className="text-xs text-gray-400 shrink-0 ml-2">{s.unit}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Quantity + Unit */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-1.5">
                                        Quantidade *
                                    </label>
                                    <input
                                        id="input-quantity"
                                        type="number"
                                        inputMode="decimal"
                                        step="0.001"
                                        min="0.001"
                                        value={form.quantity}
                                        onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                                        placeholder="0"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-400 transition-colors"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-1.5">
                                        Unidade *
                                    </label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            id="btn-unit-picker"
                                            onClick={() => setShowUnitPicker(p => !p)}
                                            className="w-full flex items-center justify-between px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-black text-gray-900 focus:outline-none focus:border-emerald-400 transition-colors bg-white"
                                        >
                                            {form.unit}
                                            <ChevronDown className="w-4 h-4 text-gray-400" />
                                        </button>
                                        {showUnitPicker && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-100 rounded-xl shadow-xl z-10 overflow-hidden max-h-44 overflow-y-auto">
                                                {UNIT_OPTIONS.map(u => (
                                                    <button
                                                        key={u}
                                                        type="button"
                                                        onClick={() => { setForm(f => ({ ...f, unit: u })); setShowUnitPicker(false) }}
                                                        className={`w-full px-4 py-2.5 text-sm font-bold text-left transition-colors ${
                                                            form.unit === u ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-gray-50 text-gray-800'
                                                        }`}
                                                    >
                                                        {u}
                                                    </button>
                                                ))}
                                                {/* Custom unit */}
                                                <div className="border-t border-gray-100 px-3 py-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Outra unidade..."
                                                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400"
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                const val = (e.target as HTMLInputElement).value.trim().toUpperCase()
                                                                if (val) { setForm(f => ({ ...f, unit: val })); setShowUnitPicker(false) }
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Date + Time */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-1.5">
                                        Data *
                                    </label>
                                    <input
                                        id="input-produced-at"
                                        type="date"
                                        value={form.produced_at}
                                        max={todayISO()}
                                        onChange={e => setForm(f => ({ ...f, produced_at: e.target.value }))}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:border-emerald-400 transition-colors"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-1.5">
                                        Horário
                                    </label>
                                    <input
                                        id="input-produced-time"
                                        type="time"
                                        value={form.produced_time}
                                        onChange={e => setForm(f => ({ ...f, produced_time: e.target.value }))}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:border-emerald-400 transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Responsible */}
                            <div>
                                <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-1.5">
                                    Responsável *
                                </label>
                                <input
                                    id="input-responsible"
                                    type="text"
                                    value={form.responsible}
                                    onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))}
                                    placeholder="Nome do responsável pela produção"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-400 transition-colors"
                                    required
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-1.5">
                                    Observações <span className="text-gray-400 normal-case font-medium">(opcional)</span>
                                </label>
                                <textarea
                                    id="input-notes"
                                    value={form.notes}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    placeholder="Ex: produção extra por demanda, perda de x%, etc."
                                    rows={2}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-400 transition-colors resize-none"
                                />
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                id="btn-submit-production"
                                disabled={submitting}
                                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 active:scale-[0.98] text-white font-black text-sm py-4 rounded-2xl transition-all shadow-lg shadow-emerald-200"
                            >
                                {submitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        Salvar Registro
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
