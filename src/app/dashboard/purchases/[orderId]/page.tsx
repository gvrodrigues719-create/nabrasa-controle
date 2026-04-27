'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
    ArrowLeft, Plus, Send, Trash2, FileText,
    CheckCircle2, Clock, AlertTriangle, ChevronRight, History
} from 'lucide-react'
import {
    getOrderDetailAction,
    addItemToOrderAction,
    removeItemFromOrderAction,
    updateItemQtyAction,
    submitOrderAction,
    cancelOrderAction,
} from '@/modules/purchases/actions'
import type { PurchaseOrder, PurchaseOrderItem, PurchaseItem } from '@/modules/purchases/types'
import { EDITABLE_STATUSES } from '@/modules/purchases/types'
import { OrderStatusBadge } from '../components/OrderStatusBadge'
import { OrderItemRow } from '../components/OrderItemRow'
import { ItemSearchDrawer } from '../components/ItemSearchDrawer'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
const EVENT_LABELS: Record<string, string> = {
    order_created: 'Pedido criado',
    item_added: 'Item adicionado',
    item_removed: 'Item removido',
    item_qty_updated: 'Quantidade alterada',
    order_submitted: 'Pedido enviado para a Cozinha Central',
    status_changed: 'Status alterado',
    order_cancelled: 'Pedido cancelado',
    order_received: 'Pedido recebido',
    divergence_registered: 'Divergência registrada',
}

export default function OrderDetailPage() {
    const params = useParams()
    const router = useRouter()
    const orderId = params.orderId as string

    const [order, setOrder] = useState<(PurchaseOrder & { events: any[] }) | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [showItemDrawer, setShowItemDrawer] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const [showCancelConfirm, setShowCancelConfirm] = useState(false)
    const [localItems, setLocalItems] = useState<PurchaseOrderItem[]>([])

    const isEditable = order ? EDITABLE_STATUSES.includes(order.status) : false
    const canReceive = order?.status === 'entregue' || order?.status === 'separado'

    const fetchOrder = useCallback(async () => {
        setLoading(true)
        const res = await getOrderDetailAction(orderId)
        if (res.success && res.data) {
            setOrder(res.data)
            setLocalItems(res.data.items ?? [])
        } else {
            toast.error('Pedido não encontrado')
            router.push('/dashboard/purchases')
        }
        setLoading(false)
    }, [orderId, router])

    useEffect(() => { fetchOrder() }, [fetchOrder])

    async function handleSelectItems(items: { item: PurchaseItem, qty: number }[]) {
        setLoading(true)
        let addedCount = 0
        for (const { item, qty } of items) {
            const res = await addItemToOrderAction(orderId, item.id, qty)
            if (res.success) {
                addedCount++
            } else {
                toast.error(`Erro ao adicionar ${item.name}: ${res.error}`)
            }
        }
        if (addedCount > 0) {
            toast.success(`${addedCount} ite${addedCount > 1 ? 'ns' : 'm'} adicionado${addedCount > 1 ? 's' : ''}`)
            await fetchOrder()
        }
        setLoading(false)
    }

    async function handleQtyChange(orderItemId: string, newQty: number) {
        setLocalItems(prev => prev.map(i => i.id === orderItemId ? { ...i, requested_qty: newQty } : i))
        await updateItemQtyAction(orderId, orderItemId, newQty)
    }

    async function handleRemove(orderItemId: string) {
        setLocalItems(prev => prev.filter(i => i.id !== orderItemId))
        const res = await removeItemFromOrderAction(orderId, orderItemId)
        if (!res.success) {
            toast.error(res.error ?? 'Erro ao remover item')
            await fetchOrder()
        }
    }

    async function handleSubmit() {
        if (localItems.length === 0) {
            toast.error('Adicione pelo menos um item antes de enviar')
            return
        }
        setSubmitting(true)
        const res = await submitOrderAction(orderId)
        if (res.success) {
            toast.success('Pedido enviado para a Cozinha Central!')
            await fetchOrder()
        } else {
            toast.error(res.error ?? 'Erro ao enviar pedido')
        }
        setSubmitting(false)
    }

    async function handleCancel(reason: string) {
        const res = await cancelOrderAction(orderId, reason)
        if (res.success) {
            toast.success('Pedido cancelado')
            router.push('/dashboard/purchases')
        } else {
            toast.error(res.error ?? 'Erro ao cancelar')
        }
        setShowCancelConfirm(false)
    }

    const existingItemIds = localItems.map(i => i.item_id)

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8F7F4] flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-4 border-[#B13A2B] border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4">Carregando pedido...</p>
            </div>
        )
    }

    if (!order) return null

    return (
        <>
            <div className="min-h-screen bg-[#F8F7F4]">
                {/* Header */}
                <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
                    <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <button onClick={() => router.push('/dashboard/purchases')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                <ArrowLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <div>
                                <h1 className="text-sm font-black text-gray-900 leading-none">
                                    #{order.id.slice(0, 8).toUpperCase()}
                                </h1>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                    {order.store_name} · {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: ptBR })}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => router.push(`/dashboard/purchases/${orderId}/print`)}
                                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                                title="Ver folha do pedido"
                            >
                                <FileText className="w-5 h-5" />
                            </button>
                            <OrderStatusBadge status={order.status} size="sm" />
                        </div>
                    </div>
                </div>

                <div className="max-w-md mx-auto px-4 py-5 space-y-5 pb-40">

                    {/* Resumo do Pedido (Pricing) */}
                    {localItems.length > 0 && (
                        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-gray-500">Total estimado</span>
                                <span className="text-sm font-black text-gray-900">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                        localItems.reduce((acc, item) => acc + (item.requested_qty * (item.unit_price || 0)), 0)
                                    )}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-gray-400">
                                <span>{localItems.length} itens</span>
                                <span>{localItems.reduce((acc, item) => acc + item.requested_qty, 0)} unidades</span>
                            </div>
                            {localItems.some(item => !item.unit_price) && (
                                <div className="mt-3 pt-3 border-t border-gray-50 flex items-start gap-2">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-amber-600">Existem itens sem preço neste pedido. O total estimado pode estar impreciso.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Status timeline hint */}
                    {order.status === 'rascunho' && (
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                            <FileText className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-black text-blue-700">Rascunho</p>
                                <p className="text-xs text-blue-600 mt-0.5">Adicione os itens e envie para a Cozinha Central quando estiver pronto.</p>
                            </div>
                        </div>
                    )}

                    {order.status === 'enviado' && (
                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
                            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-black text-amber-700">Aguardando a Cozinha Central</p>
                                <p className="text-xs text-amber-600 mt-0.5">
                                    Enviado {order.sent_at ? formatDistanceToNow(new Date(order.sent_at), { addSuffix: true, locale: ptBR }) : ''}. A cozinha está analisando.
                                </p>
                            </div>
                        </div>
                    )}

                    {(order.status === 'separado' || order.status === 'entregue') && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-black text-emerald-700">Pronto para conferir</p>
                                <p className="text-xs text-emerald-600 mt-0.5">O pedido foi separado. Confirme o recebimento abaixo.</p>
                            </div>
                        </div>
                    )}

                    {order.status === 'divergente' && (
                        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-black text-red-700">Divergência registrada</p>
                                <p className="text-xs text-red-600 mt-0.5">{order.notes ?? 'Conferência com diferença entre pedido e recebimento.'}</p>
                            </div>
                        </div>
                    )}

                    {/* Items list */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="w-1 h-4 bg-gray-900 rounded-full" />
                                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    Itens do Pedido · {localItems.length}
                                </h2>
                            </div>
                            {isEditable && (
                                <button
                                    onClick={() => setShowItemDrawer(true)}
                                    className="flex items-center gap-1.5 text-[10px] font-black text-orange-600 uppercase tracking-widest hover:opacity-70 transition-opacity"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Adicionar
                                </button>
                            )}
                        </div>

                        {localItems.length === 0 ? (
                            <button
                                onClick={() => isEditable ? setShowItemDrawer(true) : undefined}
                                className="w-full bg-white border-2 border-dashed border-gray-200 rounded-2xl py-10 flex flex-col items-center gap-3 hover:border-orange-300 transition-colors group"
                                disabled={!isEditable}
                            >
                                <div className="w-12 h-12 bg-orange-50 group-hover:bg-orange-100 rounded-2xl flex items-center justify-center transition-colors">
                                    <Plus className="w-6 h-6 text-orange-400" />
                                </div>
                                <p className="text-xs font-bold text-gray-400">
                                    {isEditable ? 'Toque para adicionar itens' : 'Nenhum item neste pedido'}
                                </p>
                            </button>
                        ) : (
                            <div className="space-y-2">
                                {localItems.map(oi => (
                                    <OrderItemRow
                                        key={oi.id}
                                        orderItem={oi}
                                        editable={isEditable}
                                        onQtyChange={handleQtyChange}
                                        onRemove={handleRemove}
                                        showSeparated={!['rascunho', 'enviado', 'em_analise'].includes(order.status)}
                                        showReceived={['recebido', 'divergente'].includes(order.status)}
                                    />
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Histórico de eventos */}
                    <section>
                        <button
                            onClick={() => setShowHistory(v => !v)}
                            className="w-full flex items-center justify-between py-3 px-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-gray-200 transition-all"
                        >
                            <div className="flex items-center gap-2">
                                <History className="w-4 h-4 text-gray-400" />
                                <span className="text-xs font-black text-gray-600 uppercase tracking-widest">Histórico</span>
                                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">
                                    {order.events?.length ?? 0}
                                </span>
                            </div>
                            <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
                        </button>

                        {showHistory && order.events?.length > 0 && (
                            <div className="mt-2 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                                {order.events.map((ev, i) => (
                                    <div key={ev.id} className={`px-4 py-3 flex items-start gap-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-2 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-gray-700">{EVENT_LABELS[ev.event_type] || ev.event_type.replace(/_/g, ' ')}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">
                                                {ev.user_name} · {formatDistanceToNow(new Date(ev.created_at), { addSuffix: true, locale: ptBR })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                {/* Bottom Action Bar */}
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-100 shadow-[0_-8px_24px_rgba(0,0,0,0.05)]">
                    <div className="max-w-md mx-auto px-4 py-3 space-y-2">

                        {isEditable && (
                            <>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting || localItems.length === 0}
                                    className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                                        localItems.length === 0 || submitting
                                        ? 'bg-gray-100 text-gray-400'
                                        : 'bg-[#B13A2B] hover:bg-[#8F2E21] text-white active:scale-[0.98]'
                                    }`}
                                >
                                    {submitting ? (
                                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        localItems.length > 0 && <Send className="w-4 h-4" />
                                    )}
                                    {localItems.length === 0 ? 'Adicione itens para enviar' : 'Enviar para Cozinha Central'}
                                </button>
                                <button
                                    onClick={() => setShowCancelConfirm(true)}
                                    className="w-full py-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors"
                                >
                                    Cancelar Pedido
                                </button>
                            </>
                        )}

                        {canReceive && (
                            <button
                                onClick={() => router.push(`/dashboard/purchases/${orderId}/receive`)}
                                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98]"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Confirmar Recebimento
                            </button>
                        )}

                        {order.status === 'recebido' && (
                            <div className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-50 border border-emerald-100">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">Pedido Recebido</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Item Search Drawer */}
            <ItemSearchDrawer
                isOpen={showItemDrawer}
                onClose={() => setShowItemDrawer(false)}
                onAddItems={handleSelectItems}
                excludeItemIds={existingItemIds}
            />

            {/* Cancel confirm */}
            {showCancelConfirm && (
                <div className="fixed inset-0 z-[60] bg-black/50 flex items-end">
                    <div className="w-full bg-white rounded-t-3xl p-6 space-y-4 max-w-md mx-auto">
                        <h3 className="text-base font-black text-gray-900">Cancelar pedido?</h3>
                        <p className="text-sm text-gray-500">Esta ação não pode ser desfeita. O pedido ficará registrado como cancelado.</p>
                        <button
                            onClick={() => handleCancel('Cancelado pelo gerente')}
                            className="w-full py-3 bg-red-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest active:scale-95 transition-all"
                        >
                            Sim, cancelar
                        </button>
                        <button
                            onClick={() => setShowCancelConfirm(false)}
                            className="w-full py-3 text-gray-500 text-sm font-black uppercase tracking-widest"
                        >
                            Voltar
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
