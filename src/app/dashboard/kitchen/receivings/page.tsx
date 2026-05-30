'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft, Plus, Truck, Check, AlertTriangle, X,
    Loader2, ChevronLeft, ChevronRight, Package,
    Clock, Ban, CalendarDays, Search, BookOpen, Edit, MoreHorizontal, History, ChevronDown, ChevronUp
} from 'lucide-react'
import {
    getWeeklyReceivingsAction,
    createReceivingAction,
    updateReceivingAction,
    markReceivingDeliveredAction,
    markReceivingPartialAction,
    markReceivingRefusedAction,
    cancelReceivingAction,
    searchPurchaseItemsAction,
    createCatalogItemAction,
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

const CANCEL_REASONS = [
    'Criado por engano',
    'Entrega duplicada',
    'Pedido de teste',
    'Fornecedor cancelou',
    'Data errada',
    'Outro'
]

export default function ReceivingsPage() {
    const router = useRouter()
    const [weekOffset, setWeekOffset] = useState(0)
    const [loading, setLoading] = useState(true)
    const [receivings, setReceivings] = useState<CKReceiving[]>([])
    const [overdue, setOverdue] = useState<CKReceiving[]>([])

    // Modals
    const [showCreate, setShowCreate] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null)
    const [showHistory, setShowHistory] = useState(false)
    const [historyFilter, setHistoryFilter] = useState<'all' | 'delivered' | 'canceled' | 'refused' | 'tests'>('all')
    const [actionModal, setActionModal] = useState<{ type: 'deliver' | 'partial' | 'refuse' | 'cancel'; receiving: CKReceiving } | null>(null)
    const [actionNotes, setActionNotes] = useState('')
    const [actionReason, setActionReason] = useState('')
    const [actionLoading, setActionLoading] = useState(false)

    // Create form
    const [createForm, setCreateForm] = useState({ title: '', supplier_id: '', supplier_name: '', delivery_date: '', delivery_period: '', delivery_time: '', notes: '' })
    const [createItems, setCreateItems] = useState<{ 
        id?: string;
        purchase_item_id?: string; 
        receiving_catalog_item_id?: string;
        item_name: string; 
        expected_qty: string; 
        unit: string; 
        is_free?: boolean 
    }[]>([])
    const [creating, setCreating] = useState(false)
    const [userRole, setUserRole] = useState<string>('')
    // Autocomplete per item
    const [itemSuggestions, setItemSuggestions] = useState<Record<number, { id: string; name: string; order_unit: string; category?: string; source: 'catalog' | 'purchase' | 'ck_purchase'; expected_unit_price?: number; expected_total?: number; supplier_id?: string }[]>>({})
    const [itemSearching, setItemSearching] = useState<Record<number, boolean>>({})
    const [itemQuery, setItemQuery] = useState<Record<number, string>>({})
    const debounceRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({})
    // Quick-create catalog item
    const [quickCreate, setQuickCreate] = useState<{ idx: number; name: string } | null>(null)
    const [quickUnit, setQuickUnit] = useState('KG')
    const [quickCategory, setQuickCategory] = useState('')
    const [quickSaving, setQuickSaving] = useState(false)

    const week = useMemo(() => getWeekRange(weekOffset), [weekOffset])
    const todayStr = new Date().toISOString().split('T')[0]

    const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
    const [supplierQuery, setSupplierQuery] = useState('')
    const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false)

    async function fetchData() {
        setLoading(true)
        // Buscamos recebimentos e também fornecedores
        const [res, suppRes] = await Promise.all([
            getWeeklyReceivingsAction(week.start, week.end),
            import('@/modules/kitchen/purchase-catalog-actions').then(m => m.getCkSuppliersAction())
        ])
        if (res.success && res.data) {
            setReceivings(res.data.receivings)
            setOverdue(res.data.overdue)
        } else {
            toast.error(res.error || 'Erro ao carregar recebimentos')
        }
        if (suppRes.data) {
            setSuppliers(suppRes.data)
        }
        setLoading(false)
    }

    useEffect(() => { fetchData() }, [weekOffset])

    // Data filtering for New Hierarchy
    const overdueScheduled = overdue
    const scheduledToday = receivings.filter(r => r.delivery_date === todayStr && r.status === 'scheduled')
    const partials = receivings.filter(r => r.status === 'partial')

    const actionRequired = [...overdueScheduled, ...scheduledToday, ...partials]
    const historical = receivings.filter(r => ['delivered', 'refused', 'canceled'].includes(r.status))

    const filteredHistory = useMemo(() => {
        return historical.filter(r => {
            if (historyFilter === 'all') return true
            if (historyFilter === 'tests') return r.title.toUpperCase().includes('TESTE') || r.title.toUpperCase().includes('QA')
            return r.status === historyFilter
        })
    }, [historical, historyFilter])

    // Agenda da Semana (only scheduled)
    const weekDays = useMemo(() => {
        const days = []
        for (let i = 0; i < 7; i++) {
            const d = new Date(week.startDate)
            d.setDate(d.getDate() + i)
            const dateStr = d.toISOString().split('T')[0]
            const items = receivings.filter(r => r.delivery_date === dateStr && r.status === 'scheduled')
            days.push({ dateStr, dateObj: d, items })
        }
        return days
    }, [receivings, week])

    // Stats
    const scheduledCount = receivings.filter(r => r.status === 'scheduled').length
    const deliveredCount = historical.filter(r => r.status === 'delivered').length
    const partialCount = partials.length
    const refusedCount = historical.filter(r => r.status === 'refused').length

    function handleItemSearch(idx: number, query: string) {
        setItemQuery(prev => ({ ...prev, [idx]: query }))
        setItemSuggestions(prev => ({ ...prev, [idx]: [] }))
        if (debounceRef.current[idx]) clearTimeout(debounceRef.current[idx])
        if (query.length < 2) { setItemSearching(prev => ({ ...prev, [idx]: false })); return }
        setItemSearching(prev => ({ ...prev, [idx]: true }))
        debounceRef.current[idx] = setTimeout(async () => {
            const res = await searchPurchaseItemsAction(query, createForm.supplier_id === 'manual' ? undefined : (createForm.supplier_id || undefined))
            setItemSearching(prev => ({ ...prev, [idx]: false }))
            if (res.success && res.data) setItemSuggestions(prev => ({ ...prev, [idx]: res.data! }))
        }, 300)
    }

    function selectItemSuggestion(idx: number, s: { id: string; name: string; order_unit: string; expected_unit_price?: number; expected_total?: number; supplier_id?: string; source?: 'catalog' | 'purchase' | 'ck_purchase' }) {
        const n = [...createItems]
        const isCatalog = s.source === 'catalog'
        const isCkPurchase = s.source === 'ck_purchase'
        
        n[idx] = { 
            ...n[idx], 
            purchase_item_id: isCatalog || isCkPurchase ? undefined : s.id,
            receiving_catalog_item_id: isCatalog ? s.id : undefined,
            catalog_item_id: isCkPurchase ? s.id : undefined,
            supplier_id: s.supplier_id,
            item_name: s.name, 
            unit: s.order_unit, 
            expected_unit_price: s.expected_unit_price,
            expected_total: s.expected_total,
            is_free: false 
        } as any
        setCreateItems(n)
        setItemQuery(prev => ({ ...prev, [idx]: '' }))
        setItemSuggestions(prev => ({ ...prev, [idx]: [] }))
    }

    function clearItemSelection(idx: number) {
        const n = [...createItems]
        n[idx] = { 
            purchase_item_id: undefined, 
            receiving_catalog_item_id: undefined,
            catalog_item_id: undefined,
            supplier_id: undefined,
            item_name: '', 
            expected_qty: n[idx].expected_qty, 
            unit: '', 
            is_free: true 
        } as any
        setCreateItems(n)
        setItemQuery(prev => ({ ...prev, [idx]: '' }))
    }

    async function handleQuickCreate() {
        if (!quickCreate) return
        const finalUnit = quickUnit === 'OUTRO' ? '' : quickUnit
        if (!finalUnit) { toast.error('Escolha uma unidade'); return }
        setQuickSaving(true)
        const res = await createCatalogItemAction({ name: quickCreate.name, unit: finalUnit, category: quickCategory || undefined })
        if (res.success && res.data) {
            toast.success('Insumo criado!')
            // Inserir na linha da entrega automaticamente
            const n = [...createItems]
            n[quickCreate.idx] = { 
                ...n[quickCreate.idx], 
                receiving_catalog_item_id: res.data.id,
                purchase_item_id: undefined,
                item_name: res.data.name, 
                unit: res.data.unit, 
                is_free: false 
            }
            setCreateItems(n)
            setItemQuery(prev => ({ ...prev, [quickCreate.idx]: '' }))
            setItemSuggestions(prev => ({ ...prev, [quickCreate.idx]: [] }))
            setQuickCreate(null)
            setQuickUnit('KG')
            setQuickCategory('')
        } else {
            toast.error(res.error || 'Erro ao criar insumo')
        }
        setQuickSaving(false)
    }

    function openEdit(r: CKReceiving) {
        setEditingId(r.id)
        setCreateForm({
            title: r.title,
            supplier_id: r.supplier_id || (r.supplier_name && !r.supplier_id ? 'manual' : ''),
            supplier_name: r.supplier_name || '',
            delivery_date: r.delivery_date,
            delivery_period: r.delivery_period || '',
            delivery_time: r.delivery_time || '',
            notes: r.notes || ''
        })
        setCreateItems(r.items?.map(i => ({
            id: i.id,
            purchase_item_id: i.purchase_item_id || undefined,
            receiving_catalog_item_id: i.receiving_catalog_item_id || undefined,
            catalog_item_id: i.catalog_item_id || undefined,
            supplier_id: i.supplier_id || undefined,
            item_name: i.item_name,
            expected_qty: i.expected_qty ? i.expected_qty.toString() : '',
            expected_unit_price: i.expected_unit_price,
            expected_total: i.expected_total,
            unit: i.unit || 'un',
            is_free: !i.purchase_item_id && !i.receiving_catalog_item_id && !i.catalog_item_id
        } as any)) || [])
        setShowCreate(true)
    }

    async function handleSaveForm() {
        if (!createForm.delivery_date) {
            toast.error('A data da entrega é obrigatória')
            return
        }
        setCreating(true)

        let finalTitle = createForm.title
        if (!editingId) {
            const finalSupplierName = createForm.supplier_id === 'manual' ? createForm.supplier_name : (createForm.supplier_id ? suppliers.find(s => s.id === createForm.supplier_id)?.name : undefined)
            
            const parts = []
            if (finalSupplierName) parts.push(finalSupplierName)
            else parts.push('Entrega avulsa')
            
            const dateParts = createForm.delivery_date.split('-')
            if (dateParts.length === 3) {
                parts.push(`${dateParts[2]}/${dateParts[1]}`)
            } else {
                parts.push(createForm.delivery_date)
            }
            
            if (createForm.delivery_period) {
                if (createForm.delivery_period === 'manha') parts.push('Manhã')
                else if (createForm.delivery_period === 'tarde') parts.push('Tarde')
                else if (createForm.delivery_period === 'noite') parts.push('Noite')
                else parts.push(createForm.delivery_period)
            }
            
            finalTitle = parts.join(' — ')
        }

        const payloadItems = createItems.filter(i => i.item_name.trim()).map(i => ({
            id: i.id,
            item_name: i.item_name,
            purchase_item_id: i.purchase_item_id,
            receiving_catalog_item_id: i.receiving_catalog_item_id,
            catalog_item_id: (i as any).catalog_item_id,
            supplier_id: (i as any).supplier_id,
            expected_qty: parseFloat(i.expected_qty as string) || undefined,
            expected_unit_price: (i as any).expected_unit_price,
            expected_total: (i as any).expected_total,
            unit: i.unit || undefined,
        }))

        const payload = {
            title: finalTitle,
            supplier_id: createForm.supplier_id === 'manual' ? undefined : (createForm.supplier_id || undefined),
            supplier_name: createForm.supplier_name || undefined,
            delivery_date: createForm.delivery_date,
            delivery_period: createForm.delivery_period || undefined,
            delivery_time: createForm.delivery_time || undefined,
            notes: createForm.notes || undefined,
            items: payloadItems
        }

        if (editingId) {
            const res = await updateReceivingAction(editingId, payload)
            if (res.success) {
                toast.success('Entrega atualizada!')
                setShowCreate(false)
                setEditingId(null)
                fetchData()
            } else {
                toast.error(res.error || 'Erro ao atualizar')
            }
        } else {
            const res = await createReceivingAction(payload)
            if (res.success) {
                toast.success('Entrega criada!')
                setShowCreate(false)
                setCreateForm({ title: '', supplier_id: '', supplier_name: '', delivery_date: '', delivery_period: '', delivery_time: '', notes: '' })
                setCreateItems([])
                fetchData()
            } else {
                toast.error(res.error || 'Erro ao criar')
            }
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
            if (!actionReason.trim()) { toast.error('Motivo de cancelamento é obrigatório'); setActionLoading(false); return }
            res = await cancelReceivingAction(receiving.id, actionReason)
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
        const isExpanded = expandedCardId === r.id
        return (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-gray-900 line-clamp-1">
                            {r.supplier_name || r.title || 'Entrega avulsa'}
                            {(r.title.toUpperCase().includes('TESTE') || r.title.toUpperCase().includes('QA')) && (
                                <span className="ml-2 text-[9px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">Ambiente QA</span>
                            )}
                        </h4>
                        <p className="text-xs text-gray-400 font-medium mt-0.5">
                            {r.delivery_date ? `${r.delivery_date.split('-')[2]}/${r.delivery_date.split('-')[1]}` : ''}
                            {r.delivery_period ? ` • ${PERIOD_LABELS[r.delivery_period] || r.delivery_period}` : ''}
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
                        {!isExpanded && r.items.slice(0, 3).map(item => (
                            <div key={item.id} className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 font-medium truncate">{item.item_name}</span>
                                <span className="text-gray-400 shrink-0 ml-2">{item.expected_qty ? `${item.expected_qty} ${item.unit || 'un'}` : '—'}</span>
                            </div>
                        ))}
                        <button onClick={() => setExpandedCardId(isExpanded ? null : r.id)} className="w-full text-left py-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors">
                            {isExpanded ? 'Ocultar itens ↑' : (r.items.length > 3 ? `Ver todos os ${r.items.length} itens ↓` : 'Ver itens da entrega ↓')}
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] text-gray-300 italic">Itens não detalhados</p>
                        <button onClick={() => setExpandedCardId(isExpanded ? null : r.id)} className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors">
                            {isExpanded ? 'Ocultar detalhes ↑' : 'Ver detalhes ↓'}
                        </button>
                    </div>
                )}
                {r.notes && r.notes !== 'Importado do De-Para' && <p className="text-[11px] text-gray-400 bg-gray-50 p-2 rounded-lg">{r.notes}</p>}
                {r.reception_notes && <p className="text-[11px] text-green-600 bg-green-50 p-2 rounded-lg">Obs: {r.reception_notes}</p>}
                {r.refusal_reason && <p className="text-[11px] text-red-600 bg-red-50 p-2 rounded-lg">Motivo: {r.refusal_reason}</p>}
                {r.priority === 'alta' && <span className="inline-block text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-md uppercase">Alta prioridade</span>}
                {isActionable && (
                    <div className="flex gap-2 pt-1">
                        <button onClick={() => { setActionModal({ type: 'deliver', receiving: r }); setActionNotes('') }} className="flex-1 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors">Receber</button>
                        <button onClick={() => { setActionModal({ type: 'partial', receiving: r }); setActionNotes(''); setActionReason('') }} className="flex-1 py-2 rounded-xl bg-yellow-50 text-yellow-700 text-xs font-bold hover:bg-yellow-100 transition-colors">Parcial</button>
                        <button onClick={() => { setActionModal({ type: 'refuse', receiving: r }); setActionNotes(''); setActionReason('') }} className="flex-1 py-2 rounded-xl bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 transition-colors">Recusar</button>
                    </div>
                )}
                {(!isActionable && r.status === 'partial') && (
                    <div className="flex gap-2 pt-1">
                        <button onClick={() => openEdit(r)} className="flex-1 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors">Editar</button>
                        <button onClick={() => { setActionModal({ type: 'deliver', receiving: r }); setActionNotes('') }} className="flex-1 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors">Receber Restante</button>
                        <button onClick={() => { setActionModal({ type: 'refuse', receiving: r }); setActionNotes(''); setActionReason('') }} className="flex-1 py-2 rounded-xl bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 transition-colors">Recusar Restante</button>
                    </div>
                )}
                {!isActionable && r.status !== 'partial' && (
                    <div className="flex gap-2 pt-1">
                        <button onClick={() => {
                            setCreateForm({
                                title: `Cópia: ${r.title}`,
                                supplier_id: r.supplier_id || (r.supplier_name && !r.supplier_id ? 'manual' : ''),
                                supplier_name: r.supplier_name || '',
                                delivery_date: todayStr,
                                delivery_period: r.delivery_period || '',
                                delivery_time: r.delivery_time || '',
                                notes: r.notes || ''
                            });
                            setCreateItems(r.items?.map(i => ({
                                purchase_item_id: i.purchase_item_id || undefined,
                                receiving_catalog_item_id: i.receiving_catalog_item_id || undefined,
                                item_name: i.item_name,
                                expected_qty: i.expected_qty ? i.expected_qty.toString() : '',
                                unit: i.unit || 'un',
                                is_free: !i.purchase_item_id && !i.receiving_catalog_item_id
                            })) || []);
                            setShowCreate(true);
                        }} className="flex-1 py-2 rounded-xl bg-gray-50 text-gray-600 text-xs font-bold hover:bg-gray-100 transition-colors">Duplicar para hoje</button>
                    </div>
                )}
                {isExpanded && (
                    <div className="pt-2 border-t border-gray-100 mt-2 space-y-2">
                        {r.items && r.items.length > 0 && (
                            <div className="space-y-1.5 mb-2">
                                <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Itens da Entrega</h5>
                                {r.items.map(item => (
                                    <div key={item.id} className="text-[11px] bg-gray-50 rounded p-1.5 flex flex-col gap-1 border border-gray-100">
                                        <div className="flex justify-between items-center font-bold text-gray-700">
                                            <span>{item.item_name}</span>
                                            <span>{item.expected_qty} {item.unit || 'un'}</span>
                                        </div>
                                        {item.notes && item.notes !== 'Importado do De-Para' && (
                                            <p className="text-gray-500 italic text-[10px]">Obs: {item.notes}</p>
                                        )}
                                        {item.item_status && item.item_status !== 'pending' && (
                                            <p className="text-blue-500 text-[10px] font-medium">Status: {item.item_status}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex gap-2">
                        {(r.status === 'scheduled' || r.status === 'partial') && (
                            <>
                                <button onClick={() => openEdit(r)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors">
                                    <Edit className="w-3.5 h-3.5" /> Editar
                                </button>
                                <button onClick={() => { setActionModal({ type: 'cancel', receiving: r }); setActionReason('') }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors">
                                    <Ban className="w-3.5 h-3.5" /> Cancelar
                                </button>
                            </>
                        )}
                        </div>
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
                    <div className="flex items-center gap-2">
                        <button onClick={() => router.push('/dashboard/kitchen/receivings/items')} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors">
                            <BookOpen className="w-4 h-4" />
                            <span className="hidden sm:inline">Catálogo</span>
                        </button>
                        <button onClick={() => { setShowCreate(true); setCreateForm(f => ({ ...f, delivery_date: todayStr })) }} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors">
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Nova Entrega</span>
                        </button>
                    </div>
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
                        { n: scheduledToday.length, l: 'Hoje', c: 'text-blue-700 bg-blue-50' },
                        { n: scheduledCount, l: 'Previstas', c: 'text-gray-700 bg-gray-50' },
                        { n: deliveredCount, l: 'Recebidas', c: 'text-emerald-700 bg-emerald-50' },
                        { n: partialCount, l: 'Parciais', c: 'text-yellow-700 bg-yellow-50' },
                        { n: refusedCount, l: 'Recusadas', c: 'text-red-700 bg-red-50' },
                        { n: overdueScheduled.length, l: 'Atrasadas', c: 'text-orange-700 bg-orange-50' },
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
                        {/* Ação Necessária */}
                        {actionRequired.length > 0 && (
                            <section>
                                <div className="flex items-center gap-2 mb-3">
                                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                                    <h2 className="text-sm font-black text-orange-700">Ação Necessária</h2>
                                    <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">{actionRequired.length}</span>
                                </div>
                                <div className="space-y-3">{actionRequired.map(renderCard)}</div>
                            </section>
                        )}

                        {/* Agenda da Semana */}
                        {weekDays.map(({ dateStr, dateObj, items }) => {
                            const dayName = DAY_NAMES[dateObj.getDay()]
                            const isToday = dateStr === todayStr
                            const dateLabel = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
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
                                        <div className="pl-1 flex items-center gap-2">
                                            <p className="text-[11px] text-gray-300 italic">Nenhuma entrega prevista.</p>
                                            <button onClick={() => { setShowCreate(true); setCreateForm(f => ({ ...f, delivery_date: dateStr })) }} className="text-[10px] font-bold text-gray-400 hover:text-blue-500 transition-colors">+</button>
                                        </div>
                                    )}
                                </section>
                            )
                        })}

                        {/* Histórico e Concluídas */}
                        {historical.length > 0 && (
                            <section className="pt-4 border-t border-gray-200">
                                <button onClick={() => setShowHistory(!showHistory)} className="w-full flex items-center justify-between p-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <History className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm font-black text-gray-700">Histórico / Concluídas · {historical.length}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-blue-500 uppercase">Ver histórico</span>
                                        {showHistory ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                    </div>
                                </button>
                                {showHistory && (
                                    <div className="mt-4 space-y-4">
                                        {/* Filtros do Histórico */}
                                        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
                                            {[
                                                { id: 'all', l: 'Todas' },
                                                { id: 'delivered', l: 'Recebidas' },
                                                { id: 'canceled', l: 'Canceladas' },
                                                { id: 'refused', l: 'Recusadas' },
                                                { id: 'tests', l: 'Testes/QA' },
                                            ].map(f => (
                                                <button key={f.id} onClick={() => setHistoryFilter(f.id as any)} className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors ${historyFilter === f.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{f.l}</button>
                                            ))}
                                        </div>
                                        <div className="space-y-3">
                                            {filteredHistory.length > 0 ? filteredHistory.map(renderCard) : (
                                                <p className="text-center py-8 text-xs text-gray-400 italic">Nenhum registro encontrado neste filtro.</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}
                    </>
                )}
            </div>

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden shadow-2xl box-border">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-base font-black text-gray-900">{editingId ? 'Editar Entrega' : 'Nova Entrega'}</h2>
                            <button onClick={() => { setShowCreate(false); setEditingId(null) }} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-700 uppercase tracking-wider">Fornecedor</label>
                                <div className="mt-1 relative flex flex-col gap-2">
                                    <div className="relative w-full max-w-full box-border">
                                        <div 
                                            className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 bg-white cursor-pointer box-border"
                                            onClick={() => setSupplierDropdownOpen(!supplierDropdownOpen)}
                                        >
                                            <span className={`truncate mr-2 ${createForm.supplier_id ? "text-gray-900" : "text-gray-500"}`}>
                                                {createForm.supplier_id === 'manual' ? 'Outro / digitar manualmente' : (createForm.supplier_name || 'Buscar fornecedor...')}
                                            </span>
                                            <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                                        </div>

                                        {supplierDropdownOpen && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setSupplierDropdownOpen(false)}></div>
                                                <div className="absolute top-full left-0 right-0 w-full mt-1 z-50 bg-white border border-gray-100 rounded-xl shadow-lg max-h-60 flex flex-col overflow-hidden box-border">
                                                <div className="p-2 border-b border-gray-50 shrink-0 box-border">
                                                    <div className="relative w-full box-border">
                                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                        <input 
                                                            autoFocus
                                                            value={supplierQuery}
                                                            onChange={e => setSupplierQuery(e.target.value)}
                                                            placeholder="Buscar fornecedor..."
                                                            className="w-full pl-9 pr-3 py-2 bg-gray-50 border-transparent rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="overflow-y-auto p-1 scrollbar-hide flex-1">
                                                    {suppliers.filter(s => s.name.toLowerCase().includes(supplierQuery.toLowerCase())).map(s => (
                                                        <button 
                                                            key={s.id}
                                                            onClick={() => {
                                                                setCreateForm(f => ({ ...f, supplier_id: s.id, supplier_name: s.name }))
                                                                setSupplierDropdownOpen(false)
                                                                setSupplierQuery('')
                                                            }}
                                                            className="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                                                        >
                                                            {s.name}
                                                        </button>
                                                    ))}
                                                    {suppliers.filter(s => s.name.toLowerCase().includes(supplierQuery.toLowerCase())).length === 0 && (
                                                        <div className="px-3 py-4 text-center text-xs text-gray-400">Nenhum fornecedor encontrado</div>
                                                    )}
                                                    <div className="my-1 border-t border-gray-50"></div>
                                                    <button 
                                                        onClick={() => {
                                                            setCreateForm(f => ({ ...f, supplier_id: 'manual', supplier_name: '' }))
                                                            setSupplierDropdownOpen(false)
                                                            setSupplierQuery('')
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    >
                                                        Outro / digitar manualmente
                                                    </button>
                                                </div>
                                            </div>
                                            </>
                                        )}
                                    </div>
                                    {createForm.supplier_id === 'manual' && (
                                        <input 
                                            value={createForm.supplier_name} 
                                            onChange={e => setCreateForm(f => ({ ...f, supplier_name: e.target.value }))} 
                                            placeholder="Ou digite o nome do fornecedor..." 
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" 
                                        />
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black text-gray-700 uppercase tracking-wider">Data *</label>
                                    <input type="date" value={createForm.delivery_date} onChange={e => setCreateForm(f => ({ ...f, delivery_date: e.target.value }))} className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-700 uppercase tracking-wider">Período</label>
                                    <select value={createForm.delivery_period} onChange={e => setCreateForm(f => ({ ...f, delivery_period: e.target.value }))} className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white">
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
                                    <input type="time" value={createForm.delivery_time} onChange={e => setCreateForm(f => ({ ...f, delivery_time: e.target.value }))} className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                                </div>
                            )}
                            <div>
                                <label className="text-[10px] font-black text-gray-700 uppercase tracking-wider">Observação</label>
                                <textarea value={createForm.notes} onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Ex: conferir qualidade, entregar até 10h, atenção para item que veio errado na última entrega." className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none" />
                            </div>
                            {/* Items */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-black text-gray-700 uppercase tracking-wider">Itens (opcional)</label>
                                </div>
                                {createItems.length === 0 && <p className="text-xs text-gray-300 italic mb-2">Nenhum item cadastrado. Você pode criar a entrega sem detalhar.</p>}
                                <button type="button" onClick={() => setCreateItems(p => [...p, { item_name: '', expected_qty: '', unit: 'un', is_free: false }])} className="w-full py-2.5 rounded-xl border-2 border-dashed border-blue-200 text-blue-600 text-xs font-bold hover:bg-blue-50 hover:border-blue-300 transition-colors mb-3">+ Adicionar item</button>
                                {createItems.map((item, idx) => (
                                    <div key={idx} className="bg-gray-50 rounded-2xl p-3 mb-3 border border-gray-100">
                                        <div className="flex items-center justify-between mb-2">
                                            {item.item_name ? (
                                                <div className="flex items-center gap-2 flex-1">
                                                    <span className="text-xs font-black text-gray-800 truncate">{item.item_name}</span>
                                                    {item.is_free && <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-md">Item livre</span>}
                                                    {!item.is_free && item.purchase_item_id && <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">Catálogo</span>}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">Novo item</span>
                                            )}
                                            <button onClick={() => { setCreateItems(p => p.filter((_, i) => i !== idx)); setItemSuggestions(p => { const n = {...p}; delete n[idx]; return n }) }} className="text-gray-300 hover:text-red-500 ml-2 shrink-0"><X className="w-4 h-4" /></button>
                                        </div>
                                        {/* Search field or selected display */}
                                        {!item.item_name ? (
                                            <div className="relative">
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                                    <input
                                                        value={itemQuery[idx] || ''}
                                                        onChange={e => handleItemSearch(idx, e.target.value)}
                                                        placeholder="Buscar item do catálogo..."
                                                        className="w-full pl-8 pr-3 py-2 border border-gray-200 bg-white rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400"
                                                        autoFocus
                                                    />
                                                    {itemSearching[idx] && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-500 animate-spin" />}
                                                </div>
                                                {/* Suggestions */}
                                                {(itemQuery[idx] || '').length >= 2 && !itemSearching[idx] && (
                                                    <div className="mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                                                        {(itemSuggestions[idx] || []).length > 0 ? (
                                                                (itemSuggestions[idx] || []).map(s => (
                                                                <button key={s.id} type="button" onClick={() => selectItemSuggestion(idx, s)} className="w-full text-left px-3 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0">
                                                                    <p className="text-xs font-bold text-gray-800">{s.name}</p>
                                                                    <p className="text-[10px] text-gray-400 mt-0.5">{s.order_unit}{s.category ? ` · ${s.category}` : ''} · <span className={s.source === 'catalog' ? 'text-blue-500 font-bold' : 'text-gray-400'}>{s.source === 'catalog' ? 'Insumo de recebimento' : 'Item do catálogo'}</span></p>
                                                                </button>
                                                            ))
                                                        ) : (
                                                            <div className="px-3 py-3">
                                                                <p className="text-xs text-gray-400">Nenhum item encontrado.</p>
                                                                <div className="flex flex-col gap-1.5 mt-2">
                                                                    <button type="button" onClick={() => { setQuickCreate({ idx, name: (itemQuery[idx] || '').toUpperCase() }); setQuickUnit('KG'); setQuickCategory('') }} className="text-xs font-bold text-blue-600 hover:text-blue-700">+ Cadastrar novo insumo: "{itemQuery[idx]}"</button>
                                                                    <button type="button" onClick={() => { const n = [...createItems]; n[idx] = { ...n[idx], item_name: itemQuery[idx] || '', is_free: true }; setCreateItems(n); setItemQuery(p => ({ ...p, [idx]: '' })); setItemSuggestions(p => ({ ...p, [idx]: [] })) }} className="text-xs font-bold text-gray-500 hover:text-gray-700">Salvar como item livre</button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <button type="button" onClick={() => clearItemSelection(idx)} className="text-[10px] text-gray-400 hover:text-red-500 font-bold underline mb-2 block">Trocar item</button>
                                        )}
                                        {/* Qty + Unit */}
                                        {item.item_name && (
                                            <div className="flex gap-2 mt-2">
                                                <input value={item.expected_qty} onChange={e => { const n = [...createItems]; n[idx].expected_qty = e.target.value; setCreateItems(n) }} placeholder="Qtd prevista" type="number" className="flex-1 px-3 py-2 border border-gray-200 bg-white rounded-xl text-xs font-medium text-gray-900 text-center focus:outline-none focus:ring-1 focus:ring-blue-400" />
                                                <input value={item.unit} onChange={e => { const n = [...createItems]; n[idx].unit = e.target.value; setCreateItems(n) }} placeholder="Unid." className="w-20 px-2 py-2 border border-gray-200 bg-white rounded-xl text-xs font-medium text-gray-900 text-center focus:outline-none focus:ring-1 focus:ring-blue-400" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleSaveForm} disabled={creating} className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />)}
                                {editingId ? 'Salvar Alterações' : 'Criar Entrega'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Modal */}
            {actionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-gray-100 shrink-0">
                            <h2 className="text-base font-black text-gray-900">
                                {actionModal.type === 'deliver' ? `Confirmar recebimento da entrega ${actionModal.receiving.supplier_name || actionModal.receiving.title}?` : actionModal.type === 'partial' ? 'Conferência de Entrega Parcial' : actionModal.type === 'refuse' ? 'Recusar entrega' : 'Cancelar Entrega'}
                            </h2>
                            {actionModal.type !== 'deliver' && (
                                <p className="text-xs text-gray-400 mt-1">{actionModal.receiving.title}{actionModal.receiving.supplier_name ? ` — ${actionModal.receiving.supplier_name}` : ''}</p>
                            )}
                            {actionModal.type === 'deliver' && <p className="text-xs text-gray-500 mt-2">Essa entrega será marcada como recebida.</p>}
                        </div>
                        <div className="p-5 space-y-4 overflow-y-auto">
                            {actionModal.type === 'refuse' && (
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1 block">Motivo da Recusa *</label>
                                    <div className="space-y-1">
                                        {REFUSAL_REASONS.map(r => (
                                            <button key={r} onClick={() => setActionReason(r)} className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors ${actionReason === r ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'}`}>{r}</button>
                                        ))}
                                    </div>
                                    <textarea value={actionNotes} onChange={e => setActionNotes(e.target.value)} rows={2} placeholder="Observação adicional detalhando a recusa..." className="w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none" />
                                </div>
                            )}
                            {actionModal.type === 'partial' && (
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2 block">Itens da entrega (Conferência)</label>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 mb-3">
                                        {actionModal.receiving.items?.map(item => (
                                            <div key={item.id} className="text-[11px] border border-gray-200 rounded-lg p-2 bg-gray-50 flex justify-between items-center shadow-sm">
                                                <span className="font-bold text-gray-700">{item.item_name}</span>
                                                <span className="text-gray-500">{item.expected_qty} {item.unit || 'un'}</span>
                                            </div>
                                        ))}
                                        {(!actionModal.receiving.items || actionModal.receiving.items.length === 0) && (
                                            <p className="text-xs text-gray-400 italic text-center py-2">Nenhum item detalhado nesta entrega.</p>
                                        )}
                                    </div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1 block">Motivo / Divergência Encontrada *</label>
                                    <div className="space-y-1 mb-2">
                                        {['Faltou item', 'Veio quantidade menor', 'Produto errado', 'Qualidade ruim', 'Fornecedor entregou incompleto', 'Outro'].map(r => (
                                            <button key={r} onClick={() => setActionReason(r)} className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors ${actionReason === r ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'}`}>{r}</button>
                                        ))}
                                    </div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1 block">Observação Específica *</label>
                                    <textarea value={actionNotes} onChange={e => setActionNotes(e.target.value)} rows={3} placeholder="Descreva quais itens vieram divergentes ou o que faltou..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-400 resize-none" />
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
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1 block">Motivo do Cancelamento *</label>
                                    <div className="space-y-1">
                                        {CANCEL_REASONS.map(r => (
                                            <button key={r} onClick={() => setActionReason(r)} className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors ${actionReason === r ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'}`}>{r}</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-5 border-t border-gray-100 flex gap-3 bg-gray-50 shrink-0">
                            <button onClick={() => { setActionModal(null); setActionNotes(''); setActionReason('') }} disabled={actionLoading} className="flex-1 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
                            <button onClick={handleAction} disabled={actionLoading} className={`flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${actionModal.type === 'deliver' ? 'bg-emerald-600 hover:bg-emerald-700' : actionModal.type === 'partial' ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-red-500 hover:bg-red-600'}`}>
                                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {actionModal.type === 'deliver' ? 'Confirmar recebimento' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Quick-create catalog item modal */}
            {quickCreate && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-black text-gray-900">Cadastrar insumo</h2>
                                <p className="text-xs text-gray-400 mt-0.5">O item será salvo no catálogo e adicionado à entrega</p>
                            </div>
                            <button onClick={() => setQuickCreate(null)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-700 uppercase tracking-wider">Nome</label>
                                <input value={quickCreate.name} onChange={e => setQuickCreate(p => p ? { ...p, name: e.target.value } : null)} className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-700 uppercase tracking-wider">Unidade *</label>
                                <select value={quickUnit} onChange={e => setQuickUnit(e.target.value)} className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                                    {['KG', 'UN', 'PCT', 'CX', 'L', 'ML', 'BALDE', 'SACO', 'ROLO', 'PEÇA'].map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-700 uppercase tracking-wider">Categoria</label>
                                <select value={quickCategory} onChange={e => setQuickCategory(e.target.value)} className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                                    <option value="">Sem categoria</option>
                                    {['Carnes', 'Hortifruti', 'Laticínios', 'Mercearia', 'Limpeza', 'Descartáveis', 'Outros'].map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setQuickCreate(null)} className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">Cancelar</button>
                                <button onClick={handleQuickCreate} disabled={quickSaving} className="flex-1 py-3 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                                    {quickSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Salvar e usar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
