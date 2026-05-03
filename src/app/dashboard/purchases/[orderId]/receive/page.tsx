'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, AlertTriangle, Package } from 'lucide-react'
import { getOrderDetailAction, confirmReceivedAction } from '@/modules/purchases/actions'
import type { PurchaseOrder } from '@/modules/purchases/types'
import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import toast from 'react-hot-toast'

interface ReceiveState {
    orderItemId: string
    requestedQty: number
    separatedQty: number | null
    receivedQty: number
    receivedNotes: string
    itemName: string
    unit: string
    allowsDecimal: boolean
}

function qtyEqual(a: number | null | undefined, b: number | null | undefined): boolean {
    return Math.abs(Number(a ?? 0) - Number(b ?? 0)) < 0.0001
}

export default function ReceiveOrderPage() {
    const params = useParams()
    const router = useRouter()
    const orderId = params.orderId as string

    const [order, setOrder] = useState<PurchaseOrder | null>(null)
    const [receiveState, setReceiveState] = useState<ReceiveState[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    // Divergence: any numeric difference in separation or receiving
    const hasDivergence = receiveState.some(s => {
        const sepDiff = !qtyEqual(s.requestedQty, s.separatedQty)
        const recvDiff = !qtyEqual(s.separatedQty ?? s.requestedQty, s.receivedQty)
        return sepDiff || recvDiff
    })

    const fetchOrder = useCallback(async () => {
        setLoading(true)
        const res = await getOrderDetailAction(orderId)
        if (res.success && res.data) {
            setOrder(res.data)
            setReceiveState(
                (res.data.items ?? []).map(oi => ({
                    orderItemId: oi.id,
                    requestedQty: oi.requested_qty,
                    separatedQty: oi.separated_qty ?? null,
                    // Pre-fill: received_qty if exists, then separated_qty, then requested_qty
                    receivedQty: oi.received_qty ?? oi.separated_qty ?? oi.requested_qty,
                    receivedNotes: oi.received_notes ?? '',
                    itemName: oi.item?.name ?? 'Item',
                    unit: oi.item?.order_unit ?? 'un',
                    allowsDecimal: oi.item?.allows_decimal ?? false,
                }))
            )
        } else {
            toast.error('Pedido não encontrado')
            router.push('/dashboard/purchases')
        }
        setLoading(false)
    }, [orderId, router])

    useEffect(() => { fetchOrder() }, [fetchOrder])

    function updateState(orderItemId: string, field: 'receivedQty' | 'receivedNotes', value: string | number) {
        setReceiveState(prev => prev.map(s =>
            s.orderItemId === orderItemId ? { ...s, [field]: value } : s
        ))
    }

    async function handleConfirm() {
        setSubmitting(true)
        const items = receiveState.map(s => ({
            orderItemId: s.orderItemId,
            receivedQty: s.receivedQty,
            receivedNotes: s.receivedNotes || undefined,
        }))

        const res = await confirmReceivedAction(orderId, items)

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
                <div className={`border rounded-2xl p-4 flex items-start gap-3 ${hasDivergence ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}>
                    {hasDivergence
                        ? <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        : <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    }
                    <div>
                        <p className={`text-xs font-black ${hasDivergence ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {hasDivergence ? 'Divergência detectada' : 'Confira item por item'}
                        </p>
                        <p className={`text-xs mt-0.5 ${hasDivergence ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {hasDivergence
                                ? 'A quantidade recebida ou separada diverge do pedido original. O status será registrado como Divergente.'
                                : 'A quantidade separada pela fábrica está pré-preenchida. Ajuste se houver diferença.'
                            }
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

                    <div className="space-y-4">
                        {receiveState.map((s) => {
                            const sepDiff = !qtyEqual(s.requestedQty, s.separatedQty)
                            const recvDiff = !qtyEqual(s.separatedQty ?? s.requestedQty, s.receivedQty)
                            const hasDiff = sepDiff || recvDiff

                            const separationDiffNum = Number(s.separatedQty ?? 0) - Number(s.requestedQty)
                            const receivingDiffNum = Number(s.receivedQty) - Number(s.separatedQty ?? s.requestedQty)

                            return (
                                <div
                                    key={s.orderItemId}
                                    className={`bg-white rounded-3xl border p-5 shadow-sm ${hasDiff ? 'border-amber-200' : 'border-gray-100'}`}
                                >
                                    {/* Item name + badge */}
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <p className="text-base font-black text-gray-900">{s.itemName}</p>
                                        {hasDiff && (
                                            <span className="shrink-0 flex items-center gap-1 text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-full">
                                                <AlertTriangle className="w-3 h-3" />
                                                Divergente
                                            </span>
                                        )}
                                    </div>

                                    {/* 3-column info: Pedido original | Separado | Recebido */}
                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        <div className="bg-gray-50 rounded-2xl p-3">
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Pedido original</p>
                                            <p className="text-base font-black text-gray-700">{s.requestedQty}</p>
                                            <p className="text-[9px] text-gray-400">{s.unit}</p>
                                        </div>
                                        <div className={`rounded-2xl p-3 ${sepDiff ? 'bg-amber-50' : 'bg-gray-50'}`}>
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Separado</p>
                                            <p className={`text-base font-black ${sepDiff ? 'text-amber-700' : 'text-gray-700'}`}>
                                                {s.separatedQty ?? '—'}
                                            </p>
                                            <p className="text-[9px] text-gray-400">{s.unit}</p>
                                            {sepDiff && (
                                                <p className={`text-[9px] font-black mt-0.5 ${separationDiffNum < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                                    {separationDiffNum > 0 ? '+' : ''}{separationDiffNum}
                                                </p>
                                            )}
                                        </div>
                                        <div className={`rounded-2xl p-3 ${recvDiff ? 'bg-red-50' : 'bg-gray-50'}`}>
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Recebido</p>
                                            <p className={`text-base font-black ${recvDiff ? 'text-red-700' : 'text-gray-700'}`}>
                                                {s.receivedQty}
                                            </p>
                                            <p className="text-[9px] text-gray-400">{s.unit}</p>
                                            {recvDiff && (
                                                <p className={`text-[9px] font-black mt-0.5 ${receivingDiffNum < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                                    {receivingDiffNum > 0 ? '+' : ''}{receivingDiffNum}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Received qty editable */}
                                    <div className="mb-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">
                                            Recebido na loja
                                        </label>
                                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-50 rounded-2xl px-3 py-2 transition-all">
                                            <input
                                                type="number"
                                                value={s.receivedQty}
                                                onChange={e => {
                                                    const val = s.allowsDecimal ? parseFloat(e.target.value) : parseInt(e.target.value)
                                                    if (!isNaN(val) && val >= 0) updateState(s.orderItemId, 'receivedQty', val)
                                                }}
                                                min={0}
                                                step={s.allowsDecimal ? 0.5 : 1}
                                                className="w-full text-sm font-black text-gray-900 bg-transparent border-none focus:outline-none"
                                            />
                                            <span className="text-xs text-gray-400 shrink-0">{s.unit}</span>
                                        </div>
                                    </div>

                                    {/* Received notes */}
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">
                                            Observação do recebimento
                                        </label>
                                        <textarea
                                            value={s.receivedNotes}
                                            onChange={e => updateState(s.orderItemId, 'receivedNotes', e.target.value)}
                                            placeholder="Observação (opcional)"
                                            rows={1}
                                            className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-300 placeholder-gray-300"
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>
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
