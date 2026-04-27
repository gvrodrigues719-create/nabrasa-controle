'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, ChefHat, MessageSquare, AlertCircle, Timer, ClipboardList, Store, Printer } from 'lucide-react'
import {
    getOrderDetailAction,
    updateSeparatedQtyAction,
    markOrderAsSeparatedAction,
    updateKitchenStatusAction,
    updateKitchenOrderNotesAction
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
    const [saving, setSaving] = useState<string | null>(null) 
    const [finalizing, setFinalizing] = useState(false)
    const [kitchenNotes, setKitchenNotes] = useState('')

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
            setKitchenNotes(res.data.kitchen_notes ?? '')
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

    async function handleSaveKitchenNotes() {
        if (!order) return
        const res = await updateKitchenOrderNotesAction(orderId, kitchenNotes)
        if (!res.success) toast.error(res.error ?? 'Erro ao salvar observação geral')
    }

    async function handleFinalize() {
        setFinalizing(true)
        // Save all items first
        for (const s of sepState) {
            await updateSeparatedQtyAction(orderId, s.orderItemId, s.separatedQty, s.notes || undefined)
        }
        await updateKitchenOrderNotesAction(orderId, kitchenNotes)
        
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

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8F7F4] flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-6">Carregando pedido...</p>
            </div>
        )
    }
    if (!order) return null

    return (
        <div className="min-h-screen bg-[#F8F7F4]">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
                <div className="max-w-md lg:max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/dashboard/kitchen')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-base font-black text-gray-900 leading-none">
                                #{order.id.slice(0, 8).toUpperCase()}
                            </h1>
                            <p className="text-[11px] text-gray-400 mt-1 font-bold">
                                Detalhes da Separação
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <OrderStatusBadge status={order.status} size="sm" />
                        <button
                            onClick={() => router.push(`/dashboard/purchases/${order.id}/print`)}
                            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-600 hidden sm:flex items-center gap-2"
                            title="Imprimir folha do pedido"
                        >
                            <Printer className="w-4 h-4" />
                            <span className="text-[11px] font-bold">Imprimir</span>
                        </button>
                        <button
                            onClick={() => router.push(`/dashboard/purchases/${order.id}/print`)}
                            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-600 sm:hidden"
                            title="Imprimir folha do pedido"
                        >
                            <Printer className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-md lg:max-w-4xl mx-auto px-4 py-6 space-y-6 pb-40">

                {/* Info Card */}
                <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                                <Store className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Loja Solicitante</p>
                                <p className="text-sm font-black text-gray-900">{order.store_name}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1 text-right">Itens</p>
                            <p className="text-sm font-black text-gray-900">{sepState.length}</p>
                        </div>
                    </div>

                    <div className="h-px bg-gray-50" />

                    <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400">
                        <div className="flex items-center gap-1.5">
                            <Timer className="w-3.5 h-3.5" />
                            {formatDistanceToNow(new Date(order.sent_at ?? order.created_at), { addSuffix: true, locale: ptBR })}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <ClipboardList className="w-3.5 h-3.5" />
                            Criado por {order.creator_name}
                        </div>
                    </div>
                </div>

                {/* Start separation banner */}
                {(order.status === 'enviado' || order.status === 'em_analise') && (
                    <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5 shadow-sm">
                        <div className="flex items-start gap-4 mb-4">
                            <ChefHat className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
                            <div>
                                <p className="text-sm font-black text-amber-900">Pronto para começar?</p>
                                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                    {order.status === 'enviado'
                                        ? 'Inicie a separação para que o solicitante saiba que o pedido está sendo processado.'
                                        : 'O pedido está em análise. Inicie a separação física agora.'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleStartSeparation}
                            className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-[0.98] shadow-sm shadow-amber-200"
                        >
                            Iniciar Separação Física
                        </button>
                    </div>
                )}

                {hasDivergence && order.status === 'em_separacao' && (
                    <div className="bg-red-50 border border-red-100 rounded-3xl p-5 flex items-start gap-4 shadow-sm">
                        <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-1" />
                        <div>
                            <p className="text-sm font-black text-red-900">Atenção: Divergência Detectada</p>
                            <p className="text-xs text-red-700 mt-1 leading-relaxed">
                                Você está separando quantidades diferentes das solicitadas. Justifique cada alteração no campo de observações.
                            </p>
                        </div>
                    </div>
                )}

                {/* Items List */}
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-1 flex-1 bg-gray-100 rounded-full" />
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            Lista de Itens · {sepState.length}
                        </h2>
                        <div className="h-1 flex-1 bg-gray-100 rounded-full" />
                    </div>

                    <div className="space-y-4">
                        {sepState.map(s => {
                            const isDiff = s.separatedQty !== s.requestedQty
                            const isSaving = saving === s.orderItemId
                            const isReadOnly = !canSeparate

                            return (
                                <div
                                    key={s.orderItemId}
                                    className={`bg-white rounded-3xl border p-5 shadow-sm transition-all duration-300 ${isDiff ? 'border-amber-200 ring-2 ring-amber-50' : 'border-gray-100'}`}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <p className="text-base font-black text-gray-900 mb-1">{s.itemName}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Solicitado</span>
                                                <span className="text-xs font-black text-gray-600 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100">
                                                    {s.requestedQty} {s.unit}
                                                </span>
                                            </div>
                                        </div>
                                        {isDiff ? (
                                            <span className="shrink-0 text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-2xl">
                                                Divergente
                                            </span>
                                        ) : (
                                            <span className="shrink-0 text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-2xl">
                                                Conferido
                                            </span>
                                        )}
                                    </div>

                                    {/* Separation Control */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">
                                                Quantidade Separada
                                            </label>
                                            <div className={`flex items-center gap-3 bg-gray-50 border rounded-2xl px-4 py-2.5 transition-all ${isReadOnly ? 'opacity-60' : 'focus-within:border-orange-300 focus-within:ring-4 focus-within:ring-orange-100'}`}>
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
                                                    className="w-full text-lg font-black text-gray-900 bg-transparent border-none focus:outline-none disabled:text-gray-500"
                                                />
                                                <span className="text-xs font-black text-gray-400 uppercase">{s.unit}</span>
                                                {isSaving && (
                                                    <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin shrink-0" />
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">
                                                Observação
                                            </label>
                                            <div className={`flex items-start gap-3 bg-gray-50 border rounded-2xl px-4 py-2 transition-all ${isReadOnly ? 'opacity-60' : 'focus-within:border-orange-300 focus-within:ring-4 focus-within:ring-orange-100'}`}>
                                                <MessageSquare className="w-4 h-4 text-gray-300 mt-3 shrink-0" />
                                                <textarea
                                                    value={s.notes}
                                                    disabled={isReadOnly}
                                                    onChange={e => updateItem(s.orderItemId, 'notes', e.target.value)}
                                                    onBlur={() => !isReadOnly && handleSaveItem(s)}
                                                    placeholder="Motivo da alteração..."
                                                    rows={1}
                                                    className="w-full text-sm text-gray-700 bg-transparent border-none focus:outline-none py-2 resize-none placeholder-gray-300"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>
            </div>

            {/* Bottom action bar */}
            {canSeparate && order.status === 'em_separacao' && (
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
                    <div className="max-w-md lg:max-w-4xl mx-auto px-4 py-5">
                        <button
                            onClick={handleFinalize}
                            disabled={finalizing}
                            className={`w-full flex items-center justify-center gap-3 py-4 rounded-3xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg ${hasDivergence ? 'bg-orange-600 shadow-orange-200' : 'bg-emerald-600 shadow-emerald-200'} text-white`}
                        >
                            {finalizing ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    {hasDivergence ? 'Finalizar com Divergências' : 'Finalizar Separação'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
