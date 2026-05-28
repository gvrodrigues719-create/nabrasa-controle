'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft, Plus, ChevronLeft, ChevronRight, X,
    Search, CheckCircle2, Factory, Clock, AlertCircle,
    ChevronDown, Ban, AlertTriangle, Wheat, Flame, TrendingDown,
} from 'lucide-react'
import {
    getProductionLogsAction,
    createProductionLogAction,
    cancelProductionLogAction,
    searchProducedItemsAction,
    searchInputItemsAction,
    getCurrentUserDisplayAction,
    LOSS_REASONS,
} from '@/modules/kitchen/production-actions'
import type { ProductionLog, ItemSuggestion } from '@/modules/kitchen/production-actions'
import toast from 'react-hot-toast'

// ─── Helpers ────────────────────────────────────────────────────────────────

function todayISO() {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
function nowTime() {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function formatDate(s: string) {
    const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`
}
function addDays(dateStr: string, days: number) {
    const d = new Date(dateStr + 'T12:00:00')
    d.setDate(d.getDate() + days)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function isToday(s: string) { return s === todayISO() }
function fmtQty(n: number) {
    return n.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
}

const UNIT_OPTIONS = ['KG', 'G', 'UN', 'L', 'ML', 'CX', 'PCT', 'BALDE', 'SACO', 'BISNAGA', 'PORÇÃO', 'DÚZIA']

// ─── Loss percentage helper ──────────────────────────────────────────────────

function calcLossPct(inputQty: number, lossQty: number, inputUnit: string, lossUnit: string): number | null {
    if (!inputQty || !lossQty || !inputUnit || !lossUnit) return null
    if (inputUnit.toUpperCase() !== lossUnit.toUpperCase()) return null
    if (lossQty <= 0 || inputQty <= 0) return null
    return Math.round((lossQty / inputQty) * 1000) / 10 // 1 decimal
}

// ─── Form state ──────────────────────────────────────────────────────────────

interface FormState {
    // Produto produzido
    product_name: string
    purchase_item_id: string
    quantity: string
    unit: string
    produced_at: string
    produced_time: string
    responsible: string
    notes: string
    // Insumo usado
    input_item_name: string
    input_purchase_item_id: string
    input_quantity: string
    input_unit: string
    // Perda
    has_loss: boolean
    loss_quantity: string
    loss_unit: string
    loss_reason: string
    loss_notes: string
}

function buildEmptyForm(date: string, responsible: string): FormState {
    return {
        product_name: '', purchase_item_id: '',
        quantity: '', unit: 'KG',
        produced_at: date, produced_time: nowTime(),
        responsible, notes: '',
        input_item_name: '', input_purchase_item_id: '',
        input_quantity: '', input_unit: 'KG',
        has_loss: false,
        loss_quantity: '', loss_unit: 'KG',
        loss_reason: '', loss_notes: '',
    }
}

// ─── Autocomplete hook ───────────────────────────────────────────────────────

function useAutocomplete(searchFn: (q: string) => Promise<{ success: boolean; data?: ItemSuggestion[] }>) {
    const [query, setQuery] = useState('')
    const [items, setItems] = useState<ItemSuggestion[]>([])
    const [show, setShow] = useState(false)
    const [loading, setLoading] = useState(false)
    const [selected, setSelected] = useState(false)
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    function onType(value: string) {
        setQuery(value)
        setSelected(false)
        if (timer.current) clearTimeout(timer.current)
        if (!value.trim() || value.length < 2) { setItems([]); setShow(false); return }
        setLoading(true)
        timer.current = setTimeout(async () => {
            const res = await searchFn(value)
            if (res.success && res.data) { setItems(res.data); setShow(res.data.length > 0) }
            setLoading(false)
        }, 300)
    }

    function pick(item: ItemSuggestion) {
        setQuery(item.name); setSelected(true); setShow(false)
        return item
    }

    function reset() { setQuery(''); setItems([]); setShow(false); setSelected(false) }

    return { query, items, show, loading, selected, onType, pick, reset, setShow }
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ProductionPage() {
    const router = useRouter()
    const [selectedDate, setSelectedDate] = useState(todayISO())
    const [logs, setLogs] = useState<ProductionLog[]>([])
    const [loading, setLoading] = useState(true)
    const [currentUserName, setCurrentUserName] = useState('')

    // Form
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState<FormState>(buildEmptyForm(todayISO(), ''))
    const [submitting, setSubmitting] = useState(false)

    // Autocomplete: produto produzido
    const productAC = useAutocomplete(searchProducedItemsAction)
    // Autocomplete: insumo usado
    const inputAC = useAutocomplete(searchInputItemsAction)

    // Unit pickers
    const [showUnitProd, setShowUnitProd] = useState(false)
    const [showUnitInput, setShowUnitInput] = useState(false)
    const [showUnitLoss, setShowUnitLoss] = useState(false)

    // Cancel
    const [cancelTarget, setCancelTarget] = useState<ProductionLog | null>(null)
    const [cancelReason, setCancelReason] = useState('')
    const [canceling, setCanceling] = useState(false)

    // ── Load user ────────────────────────────────────────────────────────────

    useEffect(() => {
        getCurrentUserDisplayAction().then(r => { if (r.success && r.data) setCurrentUserName(r.data.name) })
    }, [])

    // ── Fetch logs ───────────────────────────────────────────────────────────

    const fetchLogs = useCallback(async (date: string) => {
        setLoading(true)
        const res = await getProductionLogsAction(date)
        if (res.success) setLogs(res.data ?? [])
        else toast.error(res.error ?? 'Erro ao carregar')
        setLoading(false)
    }, [])

    useEffect(() => { fetchLogs(selectedDate) }, [selectedDate, fetchLogs])

    // ── Form helpers ─────────────────────────────────────────────────────────

    function openForm() {
        setForm(buildEmptyForm(selectedDate, currentUserName))
        productAC.reset(); inputAC.reset()
        setShowForm(true)
    }

    function resetForNext() {
        setForm(f => ({ ...buildEmptyForm(f.produced_at, f.responsible), produced_time: nowTime() }))
        productAC.reset(); inputAC.reset()
    }

    function closeForm() {
        setShowForm(false)
        setShowUnitProd(false); setShowUnitInput(false); setShowUnitLoss(false)
    }

    // ── Submit ───────────────────────────────────────────────────────────────

    async function handleSubmit(keepOpen = false) {
        if (submitting) return

        if (!productAC.selected || !form.purchase_item_id) {
            toast.error('Selecione um produto produzido da lista.')
            return
        }
        const qty = parseFloat(form.quantity.replace(',', '.'))
        if (!form.quantity || isNaN(qty) || qty <= 0) {
            toast.error('Informe a quantidade produzida (maior que zero).')
            return
        }
        if (!form.responsible.trim()) {
            toast.error('Informe o responsável.')
            return
        }

        const inputQty = form.input_quantity ? parseFloat(form.input_quantity.replace(',', '.')) : 0
        const lossQty = form.has_loss && form.loss_quantity ? parseFloat(form.loss_quantity.replace(',', '.')) : 0

        setSubmitting(true)
        const res = await createProductionLogAction({
            produced_at: form.produced_at,
            produced_time: form.produced_time || undefined,
            product_name: form.product_name,
            purchase_item_id: form.purchase_item_id,
            quantity: qty,
            unit: form.unit,
            responsible: form.responsible,
            notes: form.notes || undefined,
            // Insumo
            input_item_name: form.input_item_name || undefined,
            input_purchase_item_id: form.input_purchase_item_id || undefined,
            input_quantity: inputQty > 0 ? inputQty : undefined,
            input_unit: form.input_unit || undefined,
            // Perda
            loss_quantity: lossQty > 0 ? lossQty : undefined,
            loss_unit: form.has_loss ? form.loss_unit || undefined : undefined,
            loss_reason: form.has_loss ? form.loss_reason || undefined : undefined,
            loss_notes: form.has_loss ? form.loss_notes || undefined : undefined,
        })

        if (res.success) {
            toast.success('Produção registrada!')
            await fetchLogs(selectedDate)
            if (keepOpen) resetForNext()
            else closeForm()
        } else {
            toast.error(res.error ?? 'Erro ao salvar.')
        }
        setSubmitting(false)
    }

    // ── Cancel ───────────────────────────────────────────────────────────────

    async function handleCancel() {
        if (!cancelTarget || !cancelReason.trim()) { toast.error('Informe o motivo.'); return }
        setCanceling(true)
        const res = await cancelProductionLogAction(cancelTarget.id, cancelReason)
        if (res.success) {
            toast.success('Cancelamento registrado.')
            setCancelTarget(null); setCancelReason('')
            await fetchLogs(selectedDate)
        } else toast.error(res.error ?? 'Erro.')
        setCanceling(false)
    }

    // ── Date nav ─────────────────────────────────────────────────────────────

    function prevDay() { setSelectedDate(d => addDays(d, -1)) }
    function nextDay() { const n = addDays(selectedDate, 1); if (n <= todayISO()) setSelectedDate(n) }

    // ── Summary ──────────────────────────────────────────────────────────────

    const activeLogs = logs.filter(l => l.status === 'active')
    const canceledCount = logs.filter(l => l.status === 'canceled').length
    const logsWithLoss = activeLogs.filter(l => l.loss_quantity && Number(l.loss_quantity) > 0)
    const canRegister = isToday(selectedDate)

    // Live loss % in form
    const liveLossPct = form.has_loss
        ? calcLossPct(
            parseFloat(form.input_quantity || '0'),
            parseFloat(form.loss_quantity || '0'),
            form.input_unit,
            form.loss_unit
        )
        : null

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-[#F8F7F4]">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
                <div className="max-w-md lg:max-w-3xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button onClick={() => router.push('/dashboard/kitchen')}
                            className="p-2 hover:bg-gray-100 rounded-xl transition-colors shrink-0" id="btn-back-kitchen">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-sm font-black text-gray-900 leading-none">Produção da Fábrica</h1>
                            <p className="text-[10px] text-gray-400 mt-0.5 font-bold uppercase tracking-wider">Cozinha Central</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 bg-gray-50 rounded-xl px-1 py-1">
                        <button onClick={prevDay} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all" id="btn-prev-day">
                            <ChevronLeft className="w-4 h-4 text-gray-500" />
                        </button>
                        <div className="text-center px-2 min-w-[72px]">
                            <p className="text-xs font-black text-gray-900">{formatDate(selectedDate)}</p>
                            {isToday(selectedDate) && <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Hoje</p>}
                        </div>
                        <button onClick={nextDay} disabled={isToday(selectedDate)}
                            className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all disabled:opacity-30" id="btn-next-day">
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Body ────────────────────────────────────────────────────── */}
            <div className="max-w-md lg:max-w-3xl mx-auto px-4 py-6 pb-32 space-y-5">

                {/* Day summary strip */}
                {!loading && activeLogs.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-3 py-3 text-center">
                            <p className="text-emerald-700 font-black text-lg leading-none">{activeLogs.length}</p>
                            <p className="text-emerald-600 text-[10px] font-bold mt-1 uppercase tracking-wide">Registros</p>
                        </div>
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-3 py-3 text-center">
                            <p className="text-blue-700 font-black text-lg leading-none">
                                {activeLogs.filter(l => l.input_quantity).length}
                            </p>
                            <p className="text-blue-600 text-[10px] font-bold mt-1 uppercase tracking-wide">c/ Insumo</p>
                        </div>
                        <div className={`border rounded-2xl px-3 py-3 text-center ${
                            logsWithLoss.length > 0 ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'
                        }`}>
                            <p className={`font-black text-lg leading-none ${logsWithLoss.length > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
                                {logsWithLoss.length}
                            </p>
                            <p className={`text-[10px] font-bold mt-1 uppercase tracking-wide ${logsWithLoss.length > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                                c/ Perda
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Log list ──────────────────────────────────────────── */}
                <section className="space-y-3">
                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">
                        {isToday(selectedDate) ? 'Produção de Hoje' : `Produção de ${formatDate(selectedDate)}`}
                        {canceledCount > 0 && (
                            <span className="ml-2 text-red-400 normal-case font-bold">
                                · {canceledCount} cancelado{canceledCount > 1 ? 's' : ''}
                            </span>
                        )}
                    </h2>

                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-gray-100" />)}
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 px-6 py-10 flex flex-col items-center gap-3 text-center">
                            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center">
                                <Factory className="w-7 h-7 text-gray-300" />
                            </div>
                            <div>
                                <p className="font-black text-gray-700 text-base">Nenhum registro</p>
                                <p className="text-gray-400 text-sm mt-1">
                                    {canRegister ? 'Registre o que foi produzido hoje.' : `Sem registros em ${formatDate(selectedDate)}.`}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {logs.map(log => {
                                const isCanceled = log.status === 'canceled'
                                const lossQty = log.loss_quantity ? Number(log.loss_quantity) : 0
                                const inputQty = log.input_quantity ? Number(log.input_quantity) : 0
                                const lossPct = calcLossPct(inputQty, lossQty, log.input_unit ?? '', log.loss_unit ?? '')

                                return (
                                    <div key={log.id} className={`bg-white rounded-2xl border shadow-sm px-4 py-3.5 flex items-start gap-3 ${
                                        isCanceled ? 'border-red-100 opacity-60' : 'border-gray-100'
                                    }`}>
                                        {/* Icon */}
                                        <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${isCanceled ? 'bg-red-50' : 'bg-emerald-50'}`}>
                                            {isCanceled
                                                ? <Ban className="w-5 h-5 text-red-400" />
                                                : <Factory className="w-5 h-5 text-emerald-600" />}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0 space-y-1">
                                            {/* Produto produzido */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className={`font-black text-sm leading-tight ${isCanceled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                                    {log.product_name}
                                                </p>
                                                {isCanceled && (
                                                    <span className="text-[9px] font-black uppercase tracking-wider bg-red-100 text-red-500 px-1.5 py-0.5 rounded-md">
                                                        Cancelado
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`font-black text-xs ${isCanceled ? 'text-gray-400' : 'text-emerald-600'}`}>
                                                    {fmtQty(Number(log.quantity))} {log.unit}
                                                </span>
                                                <span className="text-gray-200 text-xs">·</span>
                                                <span className="text-gray-500 text-xs font-medium">{log.responsible}</span>
                                                {log.produced_time && (
                                                    <>
                                                        <span className="text-gray-200 text-xs">·</span>
                                                        <span className="flex items-center gap-0.5 text-gray-400 text-xs">
                                                            <Clock className="w-3 h-3" />
                                                            {log.produced_time.slice(0, 5)}
                                                        </span>
                                                    </>
                                                )}
                                            </div>

                                            {/* Insumo usado */}
                                            {log.input_item_name && !isCanceled && (
                                                <div className="flex items-center gap-1.5 bg-blue-50 rounded-lg px-2.5 py-1.5">
                                                    <Wheat className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                                    <p className="text-blue-700 text-xs font-bold truncate">
                                                        {log.input_item_name}
                                                        {log.input_quantity && (
                                                            <span className="font-black ml-1">
                                                                — {fmtQty(Number(log.input_quantity))} {log.input_unit}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Perda */}
                                            {lossQty > 0 && !isCanceled && (
                                                <div className="flex items-center gap-1.5 bg-amber-50 rounded-lg px-2.5 py-1.5">
                                                    <TrendingDown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-amber-700 text-xs font-bold">
                                                            Perda: {fmtQty(lossQty)} {log.loss_unit}
                                                            {lossPct !== null && (
                                                                <span className="ml-1 text-amber-500">({lossPct}%)</span>
                                                            )}
                                                        </p>
                                                        {log.loss_reason && (
                                                            <p className="text-amber-600 text-[10px] truncate">{log.loss_reason}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Observações gerais */}
                                            {log.notes && !isCanceled && (
                                                <p className="text-gray-400 text-[11px] italic line-clamp-1">{log.notes}</p>
                                            )}

                                            {/* Motivo do cancelamento */}
                                            {isCanceled && log.cancel_reason && (
                                                <p className="text-red-400 text-[11px] italic">Motivo: {log.cancel_reason}</p>
                                            )}
                                        </div>

                                        {/* Cancel button */}
                                        {!isCanceled && canRegister && (
                                            <button
                                                onClick={() => { setCancelTarget(log); setCancelReason('') }}
                                                className="shrink-0 p-2 rounded-xl hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all mt-0.5"
                                                id={`btn-cancel-log-${log.id}`}
                                            >
                                                <Ban className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </section>
            </div>

            {/* ── FAB ─────────────────────────────────────────────────────── */}
            {canRegister && (
                <div className="fixed bottom-6 left-0 right-0 flex justify-center z-30 pointer-events-none">
                    <button onClick={openForm} id="btn-open-production-form"
                        className="pointer-events-auto flex items-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-sm px-6 py-3.5 rounded-2xl shadow-xl shadow-emerald-300/50 transition-all">
                        <Plus className="w-5 h-5" />
                        Lançar Produção
                    </button>
                </div>
            )}

            {/* ── Cancel Modal ─────────────────────────────────────────────── */}
            {cancelTarget && (
                <div className="fixed inset-0 z-50 flex items-end justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => { setCancelTarget(null); setCancelReason('') }} />
                    <div className="relative bg-white rounded-t-3xl shadow-2xl w-full max-w-md mx-auto px-5 pt-4 pb-8">
                        <div className="flex justify-center mb-4"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-red-50 p-2.5 rounded-xl">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <h3 className="font-black text-gray-900 text-base">Cancelar Registro</h3>
                                <p className="text-gray-500 text-xs mt-0.5 truncate">{cancelTarget.product_name}</p>
                            </div>
                        </div>
                        <p className="text-gray-500 text-sm mb-3">
                            O registro <strong>não será excluído</strong>. O motivo ficará gravado para auditoria.
                        </p>
                        <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-1.5">Motivo *</label>
                        <textarea id="input-cancel-reason" value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                            placeholder="Ex: quantidade lançada errada, produto incorreto..."
                            rows={3} autoFocus
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-400 transition-colors resize-none mb-4" />
                        <div className="flex gap-3">
                            <button onClick={() => { setCancelTarget(null); setCancelReason('') }}
                                className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 font-black text-gray-600 text-sm hover:bg-gray-50 transition-all">
                                Voltar
                            </button>
                            <button onClick={handleCancel} disabled={canceling || !cancelReason.trim()} id="btn-confirm-cancel"
                                className="flex-1 py-3.5 rounded-2xl bg-red-500 hover:bg-red-600 disabled:opacity-50 font-black text-white text-sm transition-all flex items-center justify-center gap-2">
                                {canceling
                                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    : <><Ban className="w-4 h-4" /> Confirmar</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Form Sheet ──────────────────────────────────────────────── */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeForm} />

                    <div className="relative bg-white rounded-t-3xl shadow-2xl max-h-[95vh] flex flex-col">
                        {/* Sticky header */}
                        <div className="shrink-0 px-5 pt-4 pb-3 border-b border-gray-100">
                            <div className="flex justify-center mb-3"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="font-black text-gray-900 text-base">Lançar Produção</h2>
                                    <p className="text-gray-400 text-xs mt-0.5">{formatDate(form.produced_at)}</p>
                                </div>
                                <button onClick={closeForm} className="p-2 hover:bg-gray-100 rounded-xl transition-colors" id="btn-close-form">
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable body */}
                        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 pb-6">

                            {/* ═══ BLOCO A: Produto Produzido ═══════════════ */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="bg-emerald-100 p-1.5 rounded-lg">
                                        <Factory className="w-4 h-4 text-emerald-700" />
                                    </div>
                                    <p className="text-xs font-black text-gray-700 uppercase tracking-wider">Produto Produzido</p>
                                </div>

                                {/* Product autocomplete */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5">Produto *</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            {productAC.loading
                                                ? <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                                : <Search className="w-4 h-4 text-gray-400" />}
                                        </div>
                                        <input id="input-product-name" type="text" value={productAC.query}
                                            onChange={e => {
                                                productAC.onType(e.target.value)
                                                setForm(f => ({ ...f, product_name: e.target.value, purchase_item_id: '' }))
                                            }}
                                            onFocus={() => productAC.items.length > 0 && productAC.setShow(true)}
                                            placeholder="Digite para buscar no catálogo..."
                                            autoComplete="off"
                                            className={`w-full pl-10 pr-10 py-3 border-2 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none transition-colors ${
                                                productAC.selected ? 'border-emerald-400 bg-emerald-50/30' : 'border-gray-200 focus:border-emerald-400'
                                            }`}
                                        />
                                        {productAC.selected && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            </div>
                                        )}
                                        {productAC.show && productAC.items.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-100 rounded-xl shadow-xl z-20 overflow-hidden max-h-48 overflow-y-auto">
                                                {productAC.items.map(s => (
                                                    <button key={s.id} type="button"
                                                        onClick={() => {
                                                            const picked = productAC.pick(s)
                                                            setForm(f => ({ ...f, product_name: picked.name, purchase_item_id: picked.id, unit: picked.unit || f.unit }))
                                                        }}
                                                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-emerald-50 transition-colors text-left">
                                                        <span className="font-bold text-sm text-gray-900 truncate">{s.name}</span>
                                                        <span className="text-xs text-gray-400 shrink-0 ml-2">{s.unit}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {!productAC.loading && productAC.query.length >= 2 && productAC.items.length === 0 && !productAC.selected && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-amber-50 border-2 border-amber-100 rounded-xl px-4 py-3 z-20">
                                                <p className="text-amber-700 text-xs font-bold">Produto não encontrado no catálogo de produzidos.</p>
                                                <p className="text-amber-600 text-[11px] mt-0.5">Contate o administrador para classificar como "produzido".</p>
                                            </div>
                                        )}
                                    </div>
                                    {!productAC.selected && productAC.query.length > 0 && (
                                        <p className="text-amber-600 text-[11px] mt-1 flex items-center gap-1 font-bold">
                                            <AlertCircle className="w-3 h-3" /> Selecione um item da lista para continuar.
                                        </p>
                                    )}
                                </div>

                                {/* Qty + Unit */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5">Quantidade *</label>
                                        <input id="input-quantity" type="number" inputMode="decimal"
                                            step="0.001" min="0.001" value={form.quantity}
                                            onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                                            placeholder="Ex: 25"
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-400 transition-colors" />
                                    </div>
                                    <UnitPicker label="Unidade *" value={form.unit}
                                        open={showUnitProd} onToggle={() => { setShowUnitProd(p => !p); setShowUnitInput(false); setShowUnitLoss(false) }}
                                        onChange={u => { setForm(f => ({ ...f, unit: u })); setShowUnitProd(false) }} id="btn-unit-prod" />
                                </div>

                                {/* Date + Time */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5">Data *</label>
                                        <input id="input-produced-at" type="date" value={form.produced_at} max={todayISO()}
                                            onChange={e => setForm(f => ({ ...f, produced_at: e.target.value }))}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:border-emerald-400 transition-colors" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5">Horário</label>
                                        <input id="input-produced-time" type="time" value={form.produced_time}
                                            onChange={e => setForm(f => ({ ...f, produced_time: e.target.value }))}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:border-emerald-400 transition-colors" />
                                    </div>
                                </div>

                                {/* Responsible */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5">
                                        Responsável * <span className="font-normal text-gray-400">(usuário logado)</span>
                                    </label>
                                    <input id="input-responsible" type="text" value={form.responsible}
                                        onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))}
                                        placeholder="Nome do responsável"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-400 transition-colors" />
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5">
                                        Observações <span className="font-normal text-gray-400">(opcional)</span>
                                    </label>
                                    <textarea id="input-notes" value={form.notes} rows={2}
                                        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                        placeholder="Ex: lote especial, produção extra..."
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-400 transition-colors resize-none" />
                                </div>
                            </div>

                            {/* ═══ BLOCO B: Insumo Usado ════════════════════ */}
                            <div className="border-t border-gray-100 pt-5 space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="bg-blue-100 p-1.5 rounded-lg">
                                        <Wheat className="w-4 h-4 text-blue-700" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-gray-700 uppercase tracking-wider">Insumo Principal Usado</p>
                                        <p className="text-[10px] text-gray-400 font-medium">Opcional — matéria-prima usada nesta produção</p>
                                    </div>
                                </div>

                                {/* Input autocomplete */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5">Insumo</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            {inputAC.loading
                                                ? <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                                : <Search className="w-4 h-4 text-gray-400" />}
                                        </div>
                                        <input id="input-input-name" type="text" value={inputAC.query}
                                            onChange={e => {
                                                inputAC.onType(e.target.value)
                                                setForm(f => ({ ...f, input_item_name: e.target.value, input_purchase_item_id: '' }))
                                            }}
                                            onFocus={() => inputAC.items.length > 0 && inputAC.setShow(true)}
                                            placeholder="Ex: Picanha, Frango, Farinha..."
                                            autoComplete="off"
                                            className={`w-full pl-10 pr-10 py-3 border-2 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none transition-colors ${
                                                inputAC.selected ? 'border-blue-400 bg-blue-50/30' : 'border-gray-200 focus:border-blue-400'
                                            }`}
                                        />
                                        {inputAC.selected && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <CheckCircle2 className="w-4 h-4 text-blue-500" />
                                            </div>
                                        )}
                                        {inputAC.show && inputAC.items.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-100 rounded-xl shadow-xl z-20 overflow-hidden max-h-48 overflow-y-auto">
                                                {inputAC.items.map(s => (
                                                    <button key={s.id} type="button"
                                                        onClick={() => {
                                                            const picked = inputAC.pick(s)
                                                            setForm(f => ({ ...f, input_item_name: picked.name, input_purchase_item_id: picked.id, input_unit: picked.unit || f.input_unit }))
                                                        }}
                                                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 transition-colors text-left">
                                                        <span className="font-bold text-sm text-gray-900 truncate">{s.name}</span>
                                                        <span className="text-xs text-gray-400 shrink-0 ml-2">{s.unit}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5">Qtd. usada</label>
                                        <input id="input-input-qty" type="number" inputMode="decimal"
                                            step="0.001" min="0.001" value={form.input_quantity}
                                            onChange={e => setForm(f => ({ ...f, input_quantity: e.target.value }))}
                                            placeholder="Ex: 30"
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors" />
                                    </div>
                                    <UnitPicker label="Unidade" value={form.input_unit}
                                        open={showUnitInput} onToggle={() => { setShowUnitInput(p => !p); setShowUnitProd(false); setShowUnitLoss(false) }}
                                        onChange={u => { setForm(f => ({ ...f, input_unit: u })); setShowUnitInput(false) }} id="btn-unit-input" color="blue" />
                                </div>
                            </div>

                            {/* ═══ BLOCO C: Perda ═══════════════════════════ */}
                            <div className="border-t border-gray-100 pt-5 space-y-4">
                                {/* Toggle */}
                                <button type="button"
                                    onClick={() => setForm(f => ({ ...f, has_loss: !f.has_loss }))}
                                    className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 border-2 transition-all ${
                                        form.has_loss
                                            ? 'bg-amber-50 border-amber-300'
                                            : 'bg-gray-50 border-gray-200 hover:border-amber-200'
                                    }`}
                                    id="btn-toggle-loss"
                                >
                                    <div className={`p-1.5 rounded-lg ${form.has_loss ? 'bg-amber-200' : 'bg-gray-200'}`}>
                                        <Flame className={`w-4 h-4 ${form.has_loss ? 'text-amber-700' : 'text-gray-500'}`} />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className={`text-xs font-black uppercase tracking-wider ${form.has_loss ? 'text-amber-700' : 'text-gray-600'}`}>
                                            Registrar perda nesta produção
                                        </p>
                                        {!form.has_loss && (
                                            <p className="text-[10px] text-gray-400 font-medium mt-0.5">Toque para ativar</p>
                                        )}
                                    </div>
                                    <div className={`w-10 h-5 rounded-full transition-all ${form.has_loss ? 'bg-amber-400' : 'bg-gray-300'}`}>
                                        <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${form.has_loss ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </div>
                                </button>

                                {/* Loss fields */}
                                {form.has_loss && (
                                    <div className="space-y-4 animate-in slide-in-from-top-2">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-1.5">Qtd. perdida *</label>
                                                <input id="input-loss-qty" type="number" inputMode="decimal"
                                                    step="0.001" min="0.001" value={form.loss_quantity}
                                                    onChange={e => setForm(f => ({ ...f, loss_quantity: e.target.value }))}
                                                    placeholder="Ex: 3"
                                                    className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-400 transition-colors" />
                                            </div>
                                            <UnitPicker label="Unidade *" value={form.loss_unit}
                                                open={showUnitLoss} onToggle={() => { setShowUnitLoss(p => !p); setShowUnitProd(false); setShowUnitInput(false) }}
                                                onChange={u => { setForm(f => ({ ...f, loss_unit: u })); setShowUnitLoss(false) }} id="btn-unit-loss" color="amber" />
                                        </div>

                                        {/* Live loss % */}
                                        {liveLossPct !== null && (
                                            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
                                                <TrendingDown className="w-4 h-4 text-amber-500 shrink-0" />
                                                <p className="text-amber-700 text-sm font-black">
                                                    Perda sobre insumo: <span className="text-amber-900">{liveLossPct}%</span>
                                                </p>
                                            </div>
                                        )}

                                        {/* Loss reason */}
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1.5">Motivo da perda *</label>
                                            <div className="relative">
                                                <select id="input-loss-reason" value={form.loss_reason}
                                                    onChange={e => setForm(f => ({ ...f, loss_reason: e.target.value }))}
                                                    className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:border-amber-400 transition-colors appearance-none bg-white pr-10">
                                                    <option value="">Selecione o motivo...</option>
                                                    {LOSS_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                            </div>
                                        </div>

                                        {/* Loss notes */}
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1.5">
                                                Observação da perda
                                                {form.loss_reason === 'Outro' && <span className="text-red-500 ml-1">*</span>}
                                                {form.loss_reason !== 'Outro' && <span className="font-normal text-gray-400 ml-1">(opcional)</span>}
                                            </label>
                                            <textarea id="input-loss-notes" value={form.loss_notes} rows={2}
                                                onChange={e => setForm(f => ({ ...f, loss_notes: e.target.value }))}
                                                placeholder="Detalhe o que causou a perda..."
                                                className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-400 transition-colors resize-none" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ═══ Submit buttons ════════════════════════════ */}
                            <div className="space-y-2.5 pt-2">
                                <button type="button" id="btn-submit-production"
                                    disabled={submitting || !productAC.selected}
                                    onClick={() => handleSubmit(false)}
                                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] text-white font-black text-sm py-4 rounded-2xl transition-all shadow-lg shadow-emerald-200">
                                    {submitting
                                        ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Salvando...</>
                                        : <><CheckCircle2 className="w-4 h-4" /> Salvar Registro</>}
                                </button>
                                <button type="button" id="btn-submit-and-next"
                                    disabled={submitting || !productAC.selected}
                                    onClick={() => handleSubmit(true)}
                                    className="w-full flex items-center justify-center gap-2 border-2 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] text-emerald-700 font-black text-sm py-3.5 rounded-2xl transition-all">
                                    <Plus className="w-4 h-4" />
                                    Salvar e registrar outro
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── UnitPicker sub-component ────────────────────────────────────────────────

function UnitPicker({
    label, value, open, onToggle, onChange, id,
    color = 'emerald',
}: {
    label: string
    value: string
    open: boolean
    onToggle: () => void
    onChange: (u: string) => void
    id: string
    color?: 'emerald' | 'blue' | 'amber'
}) {
    const focusColor = { emerald: 'focus:border-emerald-400', blue: 'focus:border-blue-400', amber: 'focus:border-amber-400' }[color]
    const borderColor = { emerald: 'border-gray-200', blue: 'border-gray-200', amber: 'border-amber-200' }[color]
    const selectedColor = { emerald: 'bg-emerald-50 text-emerald-700', blue: 'bg-blue-50 text-blue-700', amber: 'bg-amber-50 text-amber-700' }[color]

    return (
        <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">{label}</label>
            <div className="relative">
                <button type="button" id={id} onClick={onToggle}
                    className={`w-full flex items-center justify-between px-4 py-3 border-2 ${borderColor} rounded-xl text-sm font-black text-gray-900 bg-white ${focusColor} focus:outline-none transition-colors`}>
                    {value}
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {open && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-100 rounded-xl shadow-xl z-20 overflow-hidden max-h-48 overflow-y-auto">
                        {UNIT_OPTIONS.map(u => (
                            <button key={u} type="button" onClick={() => onChange(u)}
                                className={`w-full px-4 py-2.5 text-sm font-bold text-left transition-colors ${value === u ? selectedColor : 'hover:bg-gray-50 text-gray-800'}`}>
                                {u}
                            </button>
                        ))}
                        <div className="border-t border-gray-100 px-3 py-2">
                            <input type="text" placeholder="Outra..."
                                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none"
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        const val = (e.target as HTMLInputElement).value.trim().toUpperCase()
                                        if (val) onChange(val)
                                    }
                                }} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
