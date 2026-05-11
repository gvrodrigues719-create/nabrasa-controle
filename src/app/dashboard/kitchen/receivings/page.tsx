'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft, Plus, Truck, Check, AlertTriangle, X,
    Loader2, ChevronLeft, ChevronRight, Package,
    Clock, Ban, CalendarDays, Search
} from 'lucide-react'
import {
    getWeeklyReceivingsAction,
    createReceivingAction,
    markReceivingDeliveredAction,
    markReceivingPartialAction,
    markReceivingRefusedAction,
    cancelReceivingAction,
} from '@/modules/kitchen/receivings-actions'
import type { CKReceiving } from '@/modules/kitchen/receivings-types'
import { RECEIVING_STATUS_CONFIG, PERIOD_LABELS, REFUSAL_REASONS } from '@/modules/kitchen/receivings-types'
import toast from 'react-hot-toast'

function getWeekRange(offset: number) {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1) + offset * 7
    const start = new Date(now.getFullYear(), now.getMonth(), diff)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    const fmt = (d: Date) => d.toISOString().split('T')[0]
    return { start: fmt(start), end: fmt(end), startDate: start, endDate: end }
}

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export default function ReceivingsPage() {
    const router = useRouter()
    const [weekOffset, setWeekOffset] = useState(0)
    const [loading, setLoading] = useState(true)
    const [receivings, setReceivings] = useState<CKReceiving[]>([])
    const [overdue, setOverdue] = useState<CKReceiving[]>([])

    // Modals
    const [showCreate, setShowCreate] = useState(false)
    const [actionModal, setActionModal] = useState<{ type: 'deliver' | 'partial' | 'refuse' | 'cancel'; receiving: CKReceiving } | null>(null)
    const [actionNotes, setActionNotes] = useState('')
    const [actionReason, setActionReason] = useState('')
    const [actionLoading, setActionLoading] = useState(false)

    // Create form
    const [createForm, setCreateForm] = useState({ title: '', supplier_name: '', delivery_date: '', delivery_period: '', delivery_time: '', notes: '' })
    const [createItems, setCreateItems] = useState<{ item_name: string; expected_qty: string; unit: string }[]>([])
    const [creating, setCreating] = useState(false)
    const [userRole, setUserRole] = useState<string>('')

    const week = useMemo(() => getWeekRange(weekOffset), [weekOffset])
    const todayStr = new Date().toISOString().split('T')[0]

    async function fetchData() {
        setLoading(true)
        const res = await getWeeklyReceivingsAction(week.start, week.end)
        if (res.success && res.data) {
            setReceivings(res.data.receivings)
            setOverdue(res.data.overdue)
        } else {
            toast.error(res.error || 'Erro ao carregar recebimentos')
        }
        setLoading(false)
    }

    useEffect(() => { fetchData() }, [weekOffset])

    // Stats
    const today = receivings.filter(r => r.delivery_date === todayStr)
    const scheduled = receivings.filter(r => r.status === 'scheduled')
    const delivered = receivings.filter(r => r.status === 'delivered')
    const partial = receivings.filter(r => r.status === 'partial')
    const refused = receivings.filter(r => r.status === 'refused')

    // Group by day
    const byDay = useMemo(() => {
        const map: Record<string, CKReceiving[]> = {}
        for (let i = 0; i < 7; i++) {
            const d = new Date(week.startDate)
            d.setDate(d.getDate() + i)
            const key = d.toISOString().split('T')[0]
            map[key] = receivings.filter(r => r.delivery_date === key)
        }
        return map
    }, [receivings, week])

    async function handleCreate() {
        if (!createForm.title.trim() || !createForm.delivery_date) {
            toast.error('Nome da entrega e data são obrigatórios')
            return
        }
        setCreating(true)
        const res = await createReceivingAction({
            title: createForm.title,
            supplier_name: createForm.supplier_name || undefined,
            delivery_date: createForm.delivery_date,
            delivery_period: createForm.delivery_period || undefined,
            delivery_time: createForm.delivery_time || undefined,
            notes: createForm.notes || undefined,
            items: createItems.filter(i => i.item_name.trim()).map(i => ({
                item_name: i.item_name,
                expected_qty: parseFloat(i.expected_qty) || undefined,
                unit: i.unit || undefined,
            })),
        })
        if (res.success) {
            toast.success('Entrega criada!')
            setShowCreate(false)
            setCreateForm({ title: '', supplier_name: '', delivery_date: '', delivery_period: '', delivery_time: '', notes: '' })
            setCreateItems([])
            fetchData()
        } else {
            toast.error(res.error || 'Erro ao criar')
        }
        setCreating(false)
    }

    async function handleAction() {
        if (!actionModal) return
        setActionLoading(true)
        let res: { success: boolean; error?: string }
        const { type, receiving } = actionModal
        if (type === 'deliver') {
            res = await markReceivingDeliveredAction(receiving.id, actionNotes)
        } else if (type === 'partial') {
            const partialNote = actionReason ? `${actionReason}: ${actionNotes}`.trim() : actionNotes
            if (!partialNote.trim()) { toast.error('Motivo e observação obrigatórios para parcial'); setActionLoading(false); return }
            res = await markReceivingPartialAction(receiving.id, partialNote)
        } else if (type === 'refuse') {
            const reason = actionReason || actionNotes
            if (!reason.trim()) { toast.error('Motivo obrigatório para recusa'); setActionLoading(false); return }
            res = await markReceivingRefusedAction(receiving.id, reason)
        } else {
            res = await cancelReceivingAction(receiving.id)
        }
        if (res.success) {
            toast.success(type === 'deliver' ? 'Entrega confirmada!' : type === 'partial' ? 'Marcado como parcial' : type === 'refuse' ? 'Entrega recusada' : 'Cancelado')
            setActionModal(null)
            setActionNotes('')
            setActionReason('')
            fetchData()
        } else {
            toast.error(res.error || 'Erro')
        }
        setActionLoading(false)
    }

    function renderCard(r: CKReceiving) {
        const isOverdue = r.status === 'scheduled' && r.delivery_date < todayStr
        const cfg = isOverdue ? { label: 'Atrasada', color: 'bg-orange-50', textColor: 'text-orange-700', dot: 'bg-orange-500' } : RECEIVING_STATUS_CONFIG[r.status]
        const isActionable = r.status === 'scheduled'
        return (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-gray-900 truncate">{r.title}</h4>
                        <p className="text-xs text-gray-400 font-medium mt-0.5">
                            {r.supplier_name || 'Fornecedor não informado'} {r.delivery_period ? `• ${PERIOD_LABELS[r.delivery_period] || r.delivery_period}` : ''}
                            {r.delivery_time ? ` ${r.delivery_time}` : ''}
                            {r.items && r.items.length > 0 ? ` • ${r.items.length} ${r.items.length === 1 ? 'item' : 'itens'}` : ''}
                        </p>
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${cfg.color} ${cfg.textColor}`}>
                        {cfg.label}
                    </span>
                </div>
                {r.items && r.items.length > 0 ? (
                    <div className="space-y-1">
                        {r.items.map(item => (
                            <div key={item.id} className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 font-medium truncate">{item.item_name}</span>
                                <span className="text-gray-400 shrink-0 ml-2">{item.expected_qty ? `${item.expected_qty} ${item.unit || 'un'}` : '—'}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-[11px] text-gray-300 italic">Itens não detalhados</p>
                )}
                {r.notes && <p className="text-[11px] text-gray-400 bg-gray-50 p-2 rounded-lg">{r.notes}</p>}
                {r.reception_notes && <p className="text-[11px] text-green-600 bg-green-50 p-2 rounded-lg">Obs: {r.reception_notes}</p>}
                {r.refusal_reason && <p className="text-[11px] text-red-600 bg-red-50 p-2 rounded-lg">Motivo: {r.refusal_reason}</p>}
                {r.priority === 'alta' && <span className="inline-block text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-md uppercase">Alta prioridade</span>}
                {isActionable && (
                    <div className="flex gap-2 pt-1">
                        <button onClick={() => { setActionModal({ type: 'deliver', receiving: r }); setActionNotes('') }} className="flex-1 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors">Recebido</button>
                        <button onClick={() => { setActionModal({ type: 'partial', receiving: r }); setActionNotes('') }} className="flex-1 py-2 rounded-xl bg-yellow-50 text-yellow-700 text-xs font-bold hover:bg-yellow-100 transition-colors">Parcial</button>
                        <button onClick={() => { setActionModal({ type: 'refuse', receiving: r }); setActionNotes(''); setActionReason('') }} className="flex-1 py-2 rounded-xl bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 transition-colors">Recusar</button>
                    </div>
                )}
            </div>
        )
    }

    const weekLabel = `${new Date(week.start + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a ${new Date(week.end + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`

    return (
        <div className="min-h-screen bg-[#F8F7F4] pb-24">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
                <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push('/dashboard/kitchen')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-sm font-black text-gray-900">Recebimentos da Semana</h1>
                            <p className="text-[10px] text-gray-400 font-bold">Entregas previstas para a Cozinha Central</p>
                        </div>
                    </div>
                    <button onClick={() => { setShowCreate(true); setCreateForm(f => ({ ...f, delivery_date: todayStr })) }} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors">
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Nova Entrega</span>
                    </button>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
                {/* Week Nav */}
                <div className="flex items-center justify-between bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
                    <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><ChevronLeft className="w-5 h-5 text-gray-500" /></button>
                    <div className="text-center">
                        <p className="text-xs font-black text-gray-900">{weekLabel}</p>
                        {weekOffset !== 0 && <button onClick={() => setWeekOffset(0)} className="text-[10px] text-blue-600 font-bold mt-0.5">Ir para esta semana</button>}
                    </div>
                    <button onClick={() => setWeekOffset(w => w + 1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><ChevronRight className="w-5 h-5 text-gray-500" /></button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[
                        { n: today.length, l: 'Hoje', c: 'text-blue-700 bg-blue-50' },
                        { n: scheduled.length, l: 'Previstas', c: 'text-gray-700 bg-gray-50' },
                        { n: delivered.length, l: 'Recebidas', c: 'text-emerald-700 bg-emerald-50' },
                        { n: partial.length, l: 'Parciais', c: 'text-yellow-700 bg-yellow-50' },
                        { n: refused.length, l: 'Recusadas', c: 'text-red-700 bg-red-50' },
                        { n: overdue.length, l: 'Atrasadas', c: 'text-orange-700 bg-orange-50' },
                    ].map(s => (
                        <div key={s.l} className={`p-3 rounded-xl text-center ${s.c}`}>
                            <p className="text-lg font-black leading-none">{s.n}</p>
                            <p className="text-[9px] font-bold uppercase tracking-wider mt-1">{s.l}</p>
                        </div>
                    ))}
                </div>

                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
                ) : (
                    <>
                        {/* Overdue */}
                        {overdue.length > 0 && (
                            <section>
                                <div className="flex items-center gap-2 mb-3">
                                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                                    <h2 className="text-sm font-black text-orange-700">Atrasadas</h2>
                                    <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">{overdue.length}</span>
                                </div>
                                <div className="space-y-3">{overdue.map(renderCard)}</div>
                            </section>
                        )}

                        {/* By day */}
                        {Object.entries(byDay).map(([dateStr, items]) => {
                            const d = new Date(dateStr + 'T12:00:00')
                            const dayName = DAY_NAMES[d.getDay()]
                            const isToday = dateStr === todayStr
                            const dateLabel = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                            return (
                                <section key={dateStr}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <h2 className={`text-sm font-black ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                                            {isToday ? '📦 Hoje' : dayName} <span className="font-bold text-gray-400">— {dateLabel}</span>
                                        </h2>
                                        {items.length > 0 && <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{items.length}</span>}
                                    </div>
                                    {items.length > 0 ? (
                                        <div className="space-y-3">{items.map(renderCard)}</div>
                                    ) : (
                                        <div className="pl-1 flex items-center gap-3">
                                            <p className="text-xs text-gray-300 italic">Nenhuma entrega prevista para este dia.</p>
                                            <button onClick={() => { setShowCreate(true); setCreateForm(f => ({ ...f, delivery_date: dateStr })) }} className="text-[10px] font-bold text-blue-500 hover:text-blue-700 transition-colors">+ Criar entrega</button>
                                        </div>
                                    )}
                                </section>
                            )
                        })}
                    </>
                )}
            </div>

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-base font-black text-gray-900">Nova Entrega</h2>
                            <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-700 uppercase tracking-wider">Nome da entrega *</label>
                                <input value={createForm.title} onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Hortifruti da semana, Compra de limpeza, Carnes bovinas" className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-700 uppercase tracking-wider">Fornecedor, se souber</label>
                                <input value={createForm.supplier_name} onChange={e => setCreateForm(f => ({ ...f, supplier_name: e.target.value }))} placeholder="Ex: Hortifruti São José" className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black text-gray-700 uppercase tracking-wider">Data *</label>
                                    <input type="date" value={createForm.delivery_date} onChange={e => setCreateForm(f => ({ ...f, delivery_date: e.target.value }))} className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-700 uppercase tracking-wider">Período</label>
                                    <select value={createForm.delivery_period} onChange={e => setCreateForm(f => ({ ...f, delivery_period: e.target.value }))} className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white">
                                        <option value="">Selecione</option>
                                        <option value="manha">Manhã</option>
                                        <option value="tarde">Tarde</option>
                                        <option value="noite">Noite</option>
                                        <option value="horario_especifico">Horário específico</option>
                                    </select>
                                </div>
                            </div>
                            {createForm.delivery_period === 'horario_especifico' && (
                                <div>
                                    <label className="text-[10px] font-black text-gray-700 uppercase tracking-wider">Horário</label>
                                    <input type="time" value={createForm.delivery_time} onChange={e => setCreateForm(f => ({ ...f, delivery_time: e.target.value }))} className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                                </div>
                            )}
                            <div>
                                <label className="text-[10px] font-black text-gray-700 uppercase tracking-wider">Observação</label>
                                <textarea value={createForm.notes} onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Ex: conferir qualidade, entregar até 10h, atenção para item que veio errado na última entrega." className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none" />
                            </div>
                            {/* Items */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-black text-gray-700 uppercase tracking-wider">Itens (opcional)</label>
                                </div>
                                {createItems.length === 0 && <p className="text-xs text-gray-300 italic mb-2">Nenhum item cadastrado. Você pode criar a entrega sem detalhar.</p>}
                                <button type="button" onClick={() => setCreateItems(p => [...p, { item_name: '', expected_qty: '', unit: 'un' }])} className="w-full py-2.5 rounded-xl border-2 border-dashed border-blue-200 text-blue-600 text-xs font-bold hover:bg-blue-50 hover:border-blue-300 transition-colors mb-2">+ Adicionar item</button>
                                {createItems.map((item, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2">
                                        <input value={item.item_name} onChange={e => { const n = [...createItems]; n[idx].item_name = e.target.value; setCreateItems(n) }} placeholder="Nome do item" className="flex-1 px-2 py-2 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-400" />
                                        <input value={item.expected_qty} onChange={e => { const n = [...createItems]; n[idx].expected_qty = e.target.value; setCreateItems(n) }} placeholder="Qtd" className="w-16 px-2 py-2 border border-gray-200 rounded-lg text-xs font-medium text-center focus:outline-none focus:ring-1 focus:ring-blue-400" />
                                        <input value={item.unit} onChange={e => { const n = [...createItems]; n[idx].unit = e.target.value; setCreateItems(n) }} placeholder="un" className="w-12 px-2 py-2 border border-gray-200 rounded-lg text-xs font-medium text-center focus:outline-none focus:ring-1 focus:ring-blue-400" />
                                        <button onClick={() => setCreateItems(p => p.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-500"><X className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleCreate} disabled={creating} className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Criar Entrega
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Modal */}
            {actionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl">
                        <div className="p-5 border-b border-gray-100">
                            <h2 className="text-base font-black text-gray-900">
                                {actionModal.type === 'deliver' ? 'Confirmar recebimento?' : actionModal.type === 'partial' ? 'Entrega parcial' : actionModal.type === 'refuse' ? 'Recusar entrega' : 'Cancelar Entrega'}
                            </h2>
                            <p className="text-xs text-gray-400 mt-1">{actionModal.receiving.title}{actionModal.receiving.supplier_name ? ` — ${actionModal.receiving.supplier_name}` : ''}</p>
                            {actionModal.type === 'deliver' && <p className="text-xs text-gray-500 mt-2">Essa entrega será marcada como recebida.</p>}
                        </div>
                        <div className="p-5 space-y-3">
                            {actionModal.type === 'refuse' && (
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1 block">Motivo *</label>
                                    <div className="space-y-1">
                                        {REFUSAL_REASONS.map(r => (
                                            <button key={r} onClick={() => setActionReason(r)} className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors ${actionReason === r ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'}`}>{r}</button>
                                        ))}
                                    </div>
                                    <textarea value={actionNotes} onChange={e => setActionNotes(e.target.value)} rows={2} placeholder="Observação adicional..." className="w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none" />
                                </div>
                            )}
                            {actionModal.type === 'partial' && (
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1 block">Motivo *</label>
                                    <div className="space-y-1 mb-2">
                                        {['Faltou item', 'Veio quantidade menor', 'Produto errado', 'Qualidade ruim', 'Fornecedor entregou incompleto', 'Outro'].map(r => (
                                            <button key={r} onClick={() => setActionReason(r)} className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors ${actionReason === r ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'}`}>{r}</button>
                                        ))}
                                    </div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1 block">Observação *</label>
                                    <textarea value={actionNotes} onChange={e => setActionNotes(e.target.value)} rows={3} placeholder="Descreva o que aconteceu..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-400 resize-none" />
                                </div>
                            )}
                            {actionModal.type === 'deliver' && (
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1 block">
                                        Observação (opcional)
                                    </label>
                                    <textarea value={actionNotes} onChange={e => setActionNotes(e.target.value)} rows={2} placeholder="Algo a registrar sobre a entrega?" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none" />
                                </div>
                            )}
                            {actionModal.type === 'cancel' && (
                                <p className="text-sm text-gray-500">Tem certeza que deseja cancelar esta entrega?</p>
                            )}
                        </div>
                        <div className="px-5 pb-5 flex gap-3">
                            <button onClick={() => { setActionModal(null); setActionNotes(''); setActionReason('') }} disabled={actionLoading} className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">Voltar</button>
                            <button onClick={handleAction} disabled={actionLoading} className={`flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${actionModal.type === 'deliver' ? 'bg-emerald-600 hover:bg-emerald-700' : actionModal.type === 'partial' ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-red-500 hover:bg-red-600'}`}>
                                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
