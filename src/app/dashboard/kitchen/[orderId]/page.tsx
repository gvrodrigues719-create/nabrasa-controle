'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, ChefHat, MessageSquare, AlertCircle } from 'lucide-react'
import {
    getOrderDetailAction,
    updateSeparatedQtyAction,
    markOrderAsSeparatedAction,
    updateKitchenStatusAction,
} from '@/modules/purchases/actions'
import type { PurchaseOrder, PurchaseOrderItem } from '@/modules/purchases/types'
import { OrderStatusBadge } from '../../purchases/components/OrderStatusBadge'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'

interface SeparationState {
    orderItemId: string
    separatedQty: number
    requestedQty: number
    notes: string
    itemName: string
    unit: string
    allowsDecimal: boolean
}

export default function KitchenOrderDetailPage() {
    const params = useParams()
    const router = useRouter()
    const orderId = params.orderId as string

    const [order, setOrder] = useState<PurchaseOrder | null>(null)
    const [sepState, setSepState] = useState<SeparationState[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null) // orderItemId being saved
    const [finalizing, setFinalizing] = useState(false)

    const fetchOrder = useCallback(async () => {
        setLoading(true)
        const res = await getOrderDetailAction(orderId)
        if (res.success && res.data) {
            setOrder(res.data)
            setSepState(
                (res.data.items ?? []).map(oi => ({
                    orderItemId: oi.id,
                    separatedQty: oi.separated_qty ?? oi.requested_qty,
                    requestedQty: oi.requested_qty,
                    notes: oi.notes ?? '',
                    itemName: oi.item?.name ?? 'Item',
                    unit: oi.item?.order_unit ?? 'un',
                    allowsDecimal: oi.item?.allows_decimal ?? false,
                }))
            )
        } else {
            toast.error('Pedido não encontrado')
            router.push('/dashboard/kitchen')
        }
        setLoading(false)
    }, [orderId, router])

    useEffect(() => { fetchOrder() }, [fetchOrder])

    async function handleStartSeparation() {
        if (!order) return
        if (order.status !== 'enviado' && order.status !== 'em_analise') return
        const res = await updateKitchenStatusAction(orderId, 'em_separacao')
        if (res.success) {
            await fetchOrder()
        } else {
            toast.error(res.error ?? 'Erro')
        }
    }

    async function handleSaveItem(s: SeparationState) {
        setSaving(s.orderItemId)
        const res = await updateSeparatedQtyAction(orderId, s.orderItemId, s.separatedQty, s.notes || undefined)
        if (!res.success) toast.error(res.error ?? 'Erro ao salvar')
        setSaving(null)
    }

    async function handleFinalize() {
        setFinalizing(true)
        // Save all items first
        for (const s of sepState) {
            await updateSeparatedQtyAction(orderId, s.orderItemId, s.separatedQty, s.notes || undefined)
        }
        const res = await markOrderAsSeparatedAction(orderId)
        if (res.success) {
            toast.success('Pedido marcado como separado!')
            router.push('/dashboard/kitchen')
        } else {
            toast.error(res.error ?? 'Erro ao finalizar separação')
            setFinalizing(false)
        }
    }

    function updateItem(orderItemId: string, field: 'separatedQty' | 'notes', value: string | number) {
        setSepState(prev => prev.map(s =>
            s.orderItemId === orderItemId ? { ...s, [field]: value } : s
        ))
    }

    const canSeparate = order && ['enviado', 'em_analise', 'em_separacao'].includes(order.status)
    const hasDivergence = sepState.some(s => s.separatedQty !== s.requestedQty)
    const allSaved = sepState.every(s => s.separatedQty !== null)

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8F7F4] flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4">Carregando pedido...</p>
            </div>
        )
    }
    if (!order) return null

    return (
        <div className="min-h-screen bg-[#F8F7F4]">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
                <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push('/dashboard/kitchen')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-sm font-black text-gray-900 leading-none">
                                #{order.id.slice(0, 8).toUpperCase()}
                            </h1>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                                {order.store_name} · {formatDistanceToNow(new Date(order.sent_at ?? order.created_at), { addSuffix: true, locale: ptBR })}
                            </p>
                        </div>
                    </div>
                    <OrderStatusBadge status={order.status} size="sm" />
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 py-5 space-y-5 pb-40">

                {/* Start separation banner */}
                {(order.status === 'enviado' || order.status === 'em_analise') && (
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                        <div className="flex items-start gap-3 mb-3">
                            <ChefHat className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-black text-amber-700">Iniciar Separação</p>
                                <p className="text-xs text-amber-600 mt-0.5">
                                    {order.status === 'enviado'
                                        ? 'Clique para começar a separar este pedido.'
                                        : 'Em análise. Inicie a separação quando estiver pronto.'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleStartSeparation}
                            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98]"
                        >
                            Iniciar Separação
                        </button>
                    </div>
                )}

                {hasDivergence && order.status === 'em_separacao' && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-black text-red-700">Divergência Detectada</p>
                            <p className="text-xs text-red-600 mt-0.5">
                                Alguns itens têm quantidade separada diferente do pedido. Adicione uma observação.
                            </p>
                        </div>
                    </div>
                )}

                {/* Items */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="w-1 h-4 bg-orange-500 rounded-full" />
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            Itens · {sepState.length}
                        </h2>
                    </div>

                    <div className="space-y-3">
                        {sepState.map(s => {
                            const isDiff = s.separatedQty !== s.requestedQty
                            const isSaving = saving === s.orderItemId
                            const isReadOnly = !canSeparate

                            return (
                                <div
                                    key={s.orderItemId}
                                    className={`bg-white rounded-2xl border p-4 shadow-sm transition-colors ${isDiff ? 'border-amber-200' : 'border-gray-100'}`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <p className="text-sm font-black text-gray-900">{s.itemName}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">
                                                Pedido: <strong className="text-gray-600">{s.requestedQty} {s.unit}</strong>
                                            </p>
                                        </div>
                                        {isDiff && (
                                            <span className="shrink-0 text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-full">
                                                ≠ Diferente
                                            </span>
                                        )}
                                        {!isDiff && s.separatedQty !== null && (
                                            <span className="shrink-0 text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full">
                                                ✓ OK
                                            </span>
                                        )}
                                    </div>

                                    {/* Qty separated */}
                                    <div className="flex items-center gap-3 mb-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest shrink-0 w-20">
                                            Separado
                                        </label>
                                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 flex-1">
                                            <input
                                                type="number"
                                                value={s.separatedQty}
                                                disabled={isReadOnly}
                                                onChange={e => {
                                                    const val = s.allowsDecimal ? parseFloat(e.target.value) : parseInt(e.target.value)
                                                    if (!isNaN(val) && val >= 0) updateItem(s.orderItemId, 'separatedQty', val)
                                                }}
                                                onBlur={() => !isReadOnly && handleSaveItem(s)}
                                                min={0}
                                                step={s.allowsDecimal ? 0.5 : 1}
                                                className="w-full text-sm font-black text-gray-900 bg-transparent border-none focus:outline-none disabled:text-gray-400"
                                            />
                                            <span className="text-xs text-gray-400 shrink-0">{s.unit}</span>
                                            {isSaving && (
                                                <div className="w-3.5 h-3.5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin shrink-0" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    {!isReadOnly && (
                                        <div className="flex items-start gap-2">
                                            <MessageSquare className="w-3.5 h-3.5 text-gray-300 mt-2.5 shrink-0" />
                                            <textarea
                                                value={s.notes}
                                                onChange={e => updateItem(s.orderItemId, 'notes', e.target.value)}
                                                onBlur={() => handleSaveItem(s)}
                                                placeholder="Observação (ex: faltou, produto avariado...)"
                                                rows={1}
                                                className="flex-1 text-xs text-gray-700 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-300 placeholder-gray-300"
                                            />
                                        </div>
                                    )}

                                    {isReadOnly && s.notes && (
                                        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-2 border border-amber-100">
                                            {s.notes}
                                        </p>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </section>
            </div>

            {/* Bottom action */}
            {canSeparate && order.status === 'em_separacao' && (
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-100 shadow-[0_-8px_24px_rgba(0,0,0,0.05)]">
                    <div className="max-w-md mx-auto px-4 py-4">
                        <button
                            onClick={handleFinalize}
                            disabled={finalizing}
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98] bg-orange-600 hover:bg-orange-700 text-white"
                        >
                            {finalizing ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    {hasDivergence ? 'Marcar como Separado (com divergência)' : 'Marcar como Separado'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
