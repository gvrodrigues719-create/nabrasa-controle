'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, AlertTriangle, Package } from 'lucide-react'
import { getOrderDetailAction, confirmReceivedAction, confirmReceivedWithDivergenceAction } from '@/modules/purchases/actions'
import type { PurchaseOrder, PurchaseOrderItem } from '@/modules/purchases/types'
import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import toast from 'react-hot-toast'

interface ReceiveState {
    orderItemId: string
    receivedQty: number
    separatedQty: number
    notes: string
    item: PurchaseOrderItem['item']
}

export default function ReceiveOrderPage() {
    const params = useParams()
    const router = useRouter()
    const orderId = params.orderId as string

    const [order, setOrder] = useState<PurchaseOrder | null>(null)
    const [receiveState, setReceiveState] = useState<ReceiveState[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [divergenceNotes, setDivergenceNotes] = useState('')

    const hasDivergence = receiveState.some(
        s => s.receivedQty !== s.separatedQty || s.notes.trim().length > 0
    )

    const fetchOrder = useCallback(async () => {
        setLoading(true)
        const res = await getOrderDetailAction(orderId)
        if (res.success && res.data) {
            setOrder(res.data)
            setReceiveState(
                (res.data.items ?? []).map(oi => ({
                    orderItemId: oi.id,
                    receivedQty: oi.separated_qty ?? oi.requested_qty,
                    separatedQty: oi.separated_qty ?? oi.requested_qty,
                    notes: '',
                    item: oi.item,
                }))
            )
        } else {
            toast.error('Pedido não encontrado')
            router.push('/dashboard/purchases')
        }
        setLoading(false)
    }, [orderId, router])

    useEffect(() => { fetchOrder() }, [fetchOrder])

    function updateState(orderItemId: string, field: keyof ReceiveState, value: string | number) {
        setReceiveState(prev => prev.map(s =>
            s.orderItemId === orderItemId ? { ...s, [field]: value } : s
        ))
    }

    async function handleConfirm() {
        setSubmitting(true)
        const items = receiveState.map(s => ({
            orderItemId: s.orderItemId,
            receivedQty: s.receivedQty,
            notes: s.notes || undefined,
        }))

        const res = hasDivergence
            ? await confirmReceivedWithDivergenceAction(orderId, divergenceNotes || 'Divergência registrada no recebimento', items)
            : await confirmReceivedAction(orderId, items)

        if (res.success) {
            toast.success(hasDivergence ? 'Divergência registrada!' : 'Recebimento confirmado!')
            router.push('/dashboard/purchases')
        } else {
            toast.error(res.error ?? 'Erro ao confirmar recebimento')
        }
        setSubmitting(false)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8F7F4] flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-4 border-[#B13A2B] border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4">Carregando...</p>
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
                        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-sm font-black text-gray-900 leading-none">Conferência de Recebimento</h1>
                            <p className="text-[10px] text-gray-400 mt-0.5">#{order.id.slice(0, 8).toUpperCase()} · {order.store_name}</p>
                        </div>
                    </div>
                    <OrderStatusBadge status={order.status} size="sm" />
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 py-5 space-y-5 pb-40">

                {/* Instruction */}
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-xs font-black text-emerald-700">Confira item por item</p>
                        <p className="text-xs text-emerald-600 mt-0.5">
                            A quantidade separada pela cozinha está pré-preenchida. Ajuste se houver diferença e anote observações.
                        </p>
                    </div>
                </div>

                {/* Items */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="w-1 h-4 bg-gray-900 rounded-full" />
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            Itens · {receiveState.length}
                        </h2>
                    </div>

                    <div className="space-y-3">
                        {receiveState.map((s) => {
                            const hasQtyDiff = s.receivedQty !== s.separatedQty
                            const unit = s.item?.order_unit ?? 'un'
                            const allowsDecimal = s.item?.allows_decimal ?? false

                            return (
                                <div
                                    key={s.orderItemId}
                                    className={`bg-white rounded-2xl border p-4 shadow-sm transition-colors ${hasQtyDiff || s.notes ? 'border-amber-200' : 'border-gray-100'}`}
                                >
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-black text-gray-900">{s.item?.name}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">
                                                Separado: <strong className="text-gray-600">{s.separatedQty} {unit}</strong>
                                            </p>
                                        </div>
                                        {hasQtyDiff && (
                                            <span className="shrink-0 flex items-center gap-1 text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-full">
                                                <AlertTriangle className="w-3 h-3" />
                                                Diferença
                                            </span>
                                        )}
                                    </div>

                                    {/* Qty received */}
                                    <div className="flex items-center gap-3 mb-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest shrink-0 w-20">
                                            Recebido
                                        </label>
                                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 flex-1">
                                            <input
                                                type="number"
                                                value={s.receivedQty}
                                                onChange={e => {
                                                    const val = allowsDecimal ? parseFloat(e.target.value) : parseInt(e.target.value)
                                                    if (!isNaN(val) && val >= 0) updateState(s.orderItemId, 'receivedQty', val)
                                                }}
                                                min={0}
                                                step={allowsDecimal ? 0.5 : 1}
                                                className="w-full text-sm font-black text-gray-900 bg-transparent border-none focus:outline-none"
                                            />
                                            <span className="text-xs text-gray-400 shrink-0">{unit}</span>
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <textarea
                                        value={s.notes}
                                        onChange={e => updateState(s.orderItemId, 'notes', e.target.value)}
                                        placeholder="Observação (opcional)"
                                        rows={1}
                                        className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-300 placeholder-gray-300"
                                    />
                                </div>
                            )
                        })}
                    </div>
                </section>

                {/* Divergence global notes */}
                {hasDivergence && (
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Divergência Detectada</span>
                        </div>
                        <textarea
                            value={divergenceNotes}
                            onChange={e => setDivergenceNotes(e.target.value)}
                            placeholder="Descreva o motivo da divergência para o histórico..."
                            rows={3}
                            className="w-full text-sm text-gray-700 bg-white border border-amber-200 rounded-2xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-300 placeholder-gray-400 shadow-sm"
                        />
                    </section>
                )}
            </div>

            {/* Bottom CTA */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-100 shadow-[0_-8px_24px_rgba(0,0,0,0.05)]">
                <div className="max-w-md mx-auto px-4 py-4">
                    <button
                        onClick={handleConfirm}
                        disabled={submitting}
                        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98] ${hasDivergence
                            ? 'bg-amber-500 hover:bg-amber-600 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                    >
                        {submitting ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : hasDivergence ? (
                            <>
                                <AlertTriangle className="w-4 h-4" />
                                Confirmar com Divergência
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4" />
                                Confirmar Recebimento Completo
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
