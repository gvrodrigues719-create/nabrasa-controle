'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Truck, AlertTriangle, Save, Store, Hash, CheckCheck, Copy } from 'lucide-react'
import { getOrderDetailAction, saveDispatchDraftAction, confirmDispatchAction } from '@/modules/purchases/actions'
import type { PurchaseOrder } from '@/modules/purchases/types'
import toast from 'react-hot-toast'

interface DispatchState {
    orderItemId: string
    requestedQty: number
    dispatchedQty: number
    divergenceReason: string
    itemName: string
    unit: string
    allowsDecimal: boolean
}

const QUICK_REASONS = [
    "Estoque insuficiente",
    "Produção não ficou pronta",
    "Item indisponível",
    "Ajustado pela CK",
    "Erro no pedido da loja",
    "Outro"
]

export default function KitchenDispatchPage() {
    const params = useParams()
    const router = useRouter()
    const orderId = params.orderId as string

    const [order, setOrder] = useState<PurchaseOrder | null>(null)
    const [items, setItems] = useState<DispatchState[]>([])
    const [loading, setLoading] = useState(true)
    const [savingDraft, setSavingDraft] = useState(false)
    const [confirming, setConfirming] = useState(false)
    const [globalReason, setGlobalReason] = useState('')

    const fetchOrder = useCallback(async () => {
        setLoading(true)
        const res = await getOrderDetailAction(orderId)
        if (res.success && res.data) {
            setOrder(res.data)
            setItems(
                (res.data.items ?? []).map(oi => ({
                    orderItemId: oi.id,
                    requestedQty: Number(oi.requested_qty ?? 0),
                    dispatchedQty: Number(oi.separated_qty ?? oi.requested_qty ?? 0),
                    divergenceReason: oi.separation_notes ?? '',
                    itemName: oi.item?.name ?? 'Item Desconhecido',
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

    const updateItem = (orderItemId: string, field: 'dispatchedQty' | 'divergenceReason', value: any) => {
        setItems(prev => prev.map(item => 
            item.orderItemId === orderItemId ? { ...item, [field]: value } : item
        ))
    }

    const handleFillAll = () => {
        setItems(prev => prev.map(item => ({
            ...item,
            dispatchedQty: item.requestedQty,
            divergenceReason: ''
        })))
        toast.success('Todos os itens preenchidos conforme o pedido')
    }

    const handleApplyGlobalReason = () => {
        if (!globalReason) {
            toast.error('Selecione um motivo para aplicar')
            return
        }
        setItems(prev => prev.map(item => {
            const hasDiff = Math.abs(item.requestedQty - item.dispatchedQty) >= 0.0001
            if (hasDiff && !item.divergenceReason) {
                return { ...item, divergenceReason: globalReason }
            }
            return item
        }))
        toast.success('Motivo aplicado às divergências pendentes')
    }

    const handleSaveDraft = async () => {
        setSavingDraft(true)
        const payload = items.map(i => ({
            orderItemId: i.orderItemId,
            dispatchedQty: i.dispatchedQty,
            divergenceReason: i.divergenceReason
        }))
        
        const res = await saveDispatchDraftAction(orderId, payload)
        if (res.success) {
            toast.success('Rascunho salvo com sucesso!')
            router.push(`/dashboard/kitchen/${orderId}`)
        } else {
            toast.error(res.error || 'Erro ao salvar rascunho')
        }
        setSavingDraft(false)
    }

    const handleConfirmDispatch = async () => {
        // Validate
        for (const item of items) {
            if (item.dispatchedQty < 0) {
                toast.error(`Quantidade inválida para ${item.itemName}`)
                return
            }
            const diff = Math.abs(item.requestedQty - item.dispatchedQty) >= 0.0001
            if (diff && !item.divergenceReason.trim()) {
                toast.error(`Motivo obrigatório para a divergência no item: ${item.itemName}`)
                return
            }
        }

        if (!confirm('Tem certeza que deseja confirmar o envio para a loja?')) return

        setConfirming(true)
        const payload = items.map(i => ({
            orderItemId: i.orderItemId,
            requestedQty: i.requestedQty,
            dispatchedQty: i.dispatchedQty,
            divergenceReason: i.divergenceReason
        }))

        const res = await confirmDispatchAction(orderId, payload)
        if (res.success) {
            toast.success('Expedição confirmada!')
            router.push('/dashboard/kitchen')
        } else {
            toast.error(res.error || 'Erro ao confirmar expedição')
            setConfirming(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8F7F4] flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-6">Carregando...</p>
            </div>
        )
    }
    
    if (!order) return null

    const totalItems = items.length
    const realDivergences = items.filter(i => Math.abs(i.requestedQty - i.dispatchedQty) >= 0.0001)
    const divergentItemsCount = realDivergences.length
    const missingReasonsCount = realDivergences.filter(i => !i.divergenceReason).length

    return (
        <div className="min-h-screen bg-[#F8F7F4] pb-48">
            {/* Header Fixo */}
            <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
                <div className="max-w-md lg:max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-base font-black text-gray-900 leading-none truncate">Conferência de Saída</h1>
                            <p className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-widest">
                                Pedido #{order.id.slice(0, 8)}
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-md lg:max-w-4xl mx-auto px-4 py-6 space-y-6">
                {/* Resumo */}
                <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                            <Store className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Loja de Destino</p>
                            <p className="text-sm font-black text-gray-900">{order.store_name}</p>
                        </div>
                    </div>
                    
                    <div className="h-px bg-gray-50" />
                    
                    <div className="flex gap-4">
                        <div className="flex-1 bg-gray-50 rounded-2xl p-3">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total de Itens</p>
                            <p className="text-xl font-black text-gray-900 leading-none">{totalItems}</p>
                        </div>
                        <div className={`flex-1 rounded-2xl p-3 ${divergentItemsCount > 0 ? 'bg-orange-50' : 'bg-gray-50'}`}>
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${divergentItemsCount > 0 ? 'text-orange-500' : 'text-gray-400'}`}>Divergências</p>
                            <p className={`text-xl font-black leading-none ${divergentItemsCount > 0 ? 'text-orange-600' : 'text-gray-900'}`}>{divergentItemsCount}</p>
                        </div>
                    </div>

                    <button 
                        onClick={handleFillAll}
                        className="w-full py-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-indigo-100"
                    >
                        <CheckCheck className="w-4 h-4" />
                        Preencher tudo igual ao pedido
                    </button>
                </div>

                {/* Ações Globais de Motivo */}
                {missingReasonsCount > 0 && (
                    <div className="bg-orange-50 rounded-3xl border border-orange-100 p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Ação em Lote: Motivos de Divergência</p>
                        </div>
                        <div className="flex gap-2">
                            <select
                                value={globalReason}
                                onChange={e => setGlobalReason(e.target.value)}
                                className="flex-1 bg-white border border-orange-200 rounded-2xl px-4 py-3 text-[11px] font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 appearance-none shadow-sm"
                            >
                                <option value="" disabled>Motivo rápido para todos...</option>
                                {QUICK_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <button 
                                onClick={handleApplyGlobalReason}
                                className="px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-md shadow-orange-100"
                            >
                                <Copy className="w-3.5 h-3.5" />
                                Aplicar
                            </button>
                        </div>
                        <p className="text-[9px] text-orange-400 font-bold uppercase tracking-tight text-center">
                            Aplica apenas em itens sem motivo informado
                        </p>
                    </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                    <div className="h-1 flex-1 bg-gray-200 rounded-full" />
                    <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">
                        Itens para enviar
                    </h2>
                    <div className="h-1 flex-1 bg-gray-200 rounded-full" />
                </div>

                {/* Lista de Itens */}
                <div className="space-y-4">
                    {items.map(item => {
                        const diff = Math.abs(item.requestedQty - item.dispatchedQty) >= 0.0001
                        
                        return (
                            <div key={item.orderItemId} className={`bg-white rounded-[32px] border p-5 shadow-sm transition-all duration-300 ${diff ? 'border-orange-200 ring-2 ring-orange-50 shadow-orange-50/50' : 'border-gray-100'}`}>
                                <div className="mb-4 space-y-1">
                                    <h3 className="text-base font-black text-gray-900 leading-tight">
                                        {item.itemName}
                                    </h3>
                                    <p className="text-xs font-bold text-gray-500">
                                        Pedido da loja: <span className="text-gray-900 font-black">{item.requestedQty} {item.unit}</span>
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">
                                            Quantidade a Enviar
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 flex items-center bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition-all">
                                                <input
                                                    type="number"
                                                    value={item.dispatchedQty}
                                                    min={0}
                                                    step={item.allowsDecimal ? 0.5 : 1}
                                                    onChange={e => {
                                                        const val = item.allowsDecimal ? parseFloat(e.target.value) : parseInt(e.target.value)
                                                        updateItem(item.orderItemId, 'dispatchedQty', isNaN(val) ? 0 : val)
                                                    }}
                                                    className="w-full text-lg font-black text-gray-900 bg-transparent border-none focus:outline-none"
                                                />
                                                <span className="text-xs font-black text-gray-400 uppercase ml-2">{item.unit}</span>
                                            </div>
                                            
                                            <button 
                                                onClick={() => {
                                                    updateItem(item.orderItemId, 'dispatchedQty', item.requestedQty)
                                                    updateItem(item.orderItemId, 'divergenceReason', '')
                                                }}
                                                className="px-3 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shrink-0"
                                            >
                                                Igual
                                            </button>
                                        </div>
                                    </div>

                                    {diff && (
                                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                            <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest block mb-2 px-1 flex items-center gap-1.5">
                                                <AlertTriangle className="w-3 h-3" />
                                                Motivo da divergência (Obrigatório)
                                            </label>
                                            <select
                                                value={item.divergenceReason}
                                                onChange={e => updateItem(item.orderItemId, 'divergenceReason', e.target.value)}
                                                className="w-full bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 text-sm font-bold text-orange-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 appearance-none"
                                            >
                                                <option value="" disabled>Selecione um motivo...</option>
                                                {QUICK_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </main>

            {/* Rodapé Fixo */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-100 p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
                <div className="max-w-md lg:max-w-4xl mx-auto flex gap-3">
                    <button
                        onClick={handleSaveDraft}
                        disabled={savingDraft || confirming}
                        className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                        {savingDraft ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                        Salvar Rascunho
                    </button>
                    
                    <button
                        onClick={handleConfirmDispatch}
                        disabled={savingDraft || confirming}
                        className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                    >
                        {confirming ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Truck className="w-4 h-4" />}
                        Marcar como Enviado
                    </button>
                </div>
            </div>
        </div>
    )
}
