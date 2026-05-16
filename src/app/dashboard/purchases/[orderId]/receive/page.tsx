'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, AlertTriangle, Save, PackageOpen } from 'lucide-react'
import { getOrderDetailAction, confirmReceivedAction } from '@/modules/purchases/actions'
import type { PurchaseOrder } from '@/modules/purchases/types'
import toast from 'react-hot-toast'

interface ReceiveState {
    orderItemId: string
    sentQty: number
    receivedQty: number
    receivedNotes: string
    itemName: string
    unit: string
    allowsDecimal: boolean
}

export default function StoreReceivePage() {
    const params = useParams()
    const router = useRouter()
    const orderId = params.orderId as string

    const [order, setOrder] = useState<PurchaseOrder | null>(null)
    const [items, setItems] = useState<ReceiveState[]>([])
    const [loading, setLoading] = useState(true)
    const [confirming, setConfirming] = useState(false)

    const fetchOrder = useCallback(async () => {
        setLoading(true)
        const res = await getOrderDetailAction(orderId)
        if (res.success && res.data) {
            setOrder(res.data)
            setItems(
                (res.data.items ?? []).map(oi => {
                    const sentQty = Number(oi.separated_qty ?? oi.requested_qty ?? 0)
                    return {
                        orderItemId: oi.id,
                        sentQty: sentQty,
                        receivedQty: sentQty,
                        receivedNotes: oi.received_notes ?? '',
                        itemName: oi.item?.name ?? 'Item Desconhecido',
                        unit: oi.item?.order_unit ?? 'un',
                        allowsDecimal: oi.item?.allows_decimal ?? false,
                    }
                })
            )
        } else {
            toast.error('Pedido não encontrado')
            router.push('/dashboard/purchases')
        }
        setLoading(false)
    }, [orderId, router])

    useEffect(() => { fetchOrder() }, [fetchOrder])

    const updateItem = (orderItemId: string, field: 'receivedQty' | 'receivedNotes', value: any) => {
        setItems(prev => prev.map(item => 
            item.orderItemId === orderItemId ? { ...item, [field]: value } : item
        ))
    }

    const handleReceiveAll = () => {
        setItems(prev => prev.map(item => ({
            ...item,
            receivedQty: item.sentQty,
            receivedNotes: ''
        })))
        toast.success('Todos os itens marcados como recebidos!')
    }

    const handleConfirmReceipt = async () => {
        // Validate
        for (const item of items) {
            if (item.receivedQty < 0) {
                toast.error(`Quantidade inválida para ${item.itemName}`)
                return
            }
            const diff = Math.abs(item.sentQty - item.receivedQty) >= 0.0001
            if (diff && !item.receivedNotes.trim()) {
                toast.error(`Motivo obrigatório para a divergência no item: ${item.itemName}`)
                return
            }
        }

        if (!confirm('Confirmar o recebimento dos itens? Se houver divergência, a Cozinha Central será notificada.')) return

        setConfirming(true)
        const payload = items.map(i => ({
            orderItemId: i.orderItemId,
            receivedQty: i.receivedQty,
            receivedNotes: i.receivedNotes
        }))

        const res = await confirmReceivedAction(orderId, payload)
        if (res.success) {
            toast.success('Recebimento confirmado!')
            router.push(`/dashboard/purchases/${orderId}`)
        } else {
            toast.error(res.error || 'Erro ao confirmar recebimento')
            setConfirming(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8F7F4] flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-6">Carregando...</p>
            </div>
        )
    }
    
    if (!order) return null

    const totalItems = items.length
    const divergentItemsCount = items.filter(i => Math.abs(i.sentQty - i.receivedQty) >= 0.0001).length

    return (
        <div className="min-h-screen bg-[#F8F7F4] pb-40">
            {/* Header Fixo */}
            <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
                <div className="max-w-md lg:max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-base font-black text-gray-900 leading-none truncate">Recebimento</h1>
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
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                            <PackageOpen className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Origem do Pedido</p>
                            <p className="text-sm font-black text-gray-900">Cozinha Central</p>
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
                        onClick={handleReceiveAll}
                        className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                    >
                        Marcar Tudo como Recebido
                    </button>
                </div>

                <div className="flex items-center gap-3 mb-4">
                    <div className="h-1 flex-1 bg-gray-200 rounded-full" />
                    <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">
                        Conferência de Itens
                    </h2>
                    <div className="h-1 flex-1 bg-gray-200 rounded-full" />
                </div>

                {/* Lista de Itens */}
                <div className="space-y-4">
                    {items.map(item => {
                        const diff = Math.abs(item.sentQty - item.receivedQty) >= 0.0001
                        
                        return (
                            <div key={item.orderItemId} className={`bg-white rounded-[32px] border p-5 shadow-sm transition-all duration-300 ${diff ? 'border-orange-200 ring-2 ring-orange-50' : 'border-gray-100'}`}>
                                <div className="mb-4 space-y-1">
                                    <h3 className="text-base font-black text-gray-900 leading-tight">
                                        {item.itemName}
                                    </h3>
                                    <p className="text-xs font-bold text-gray-500">
                                        Enviado pela CK: <span className="text-gray-900 font-black">{item.sentQty} {item.unit}</span>
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">
                                            Quantidade Recebida
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 flex items-center bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-emerald-100 focus-within:border-emerald-300 transition-all">
                                                <input
                                                    type="number"
                                                    value={item.receivedQty}
                                                    min={0}
                                                    step={item.allowsDecimal ? 0.5 : 1}
                                                    onChange={e => {
                                                        const val = item.allowsDecimal ? parseFloat(e.target.value) : parseInt(e.target.value)
                                                        updateItem(item.orderItemId, 'receivedQty', isNaN(val) ? 0 : val)
                                                    }}
                                                    className="w-full text-lg font-black text-gray-900 bg-transparent border-none focus:outline-none"
                                                />
                                                <span className="text-xs font-black text-gray-400 uppercase ml-2">{item.unit}</span>
                                            </div>
                                            
                                            <button 
                                                onClick={() => updateItem(item.orderItemId, 'receivedQty', item.sentQty)}
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
                                                value={item.receivedNotes}
                                                onChange={e => updateItem(item.orderItemId, 'receivedNotes', e.target.value)}
                                                className="w-full bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 text-sm font-bold text-orange-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 appearance-none"
                                            >
                                                <option value="" disabled>Selecione um motivo...</option>
                                                <option value="Faltou item">Faltou item</option>
                                                <option value="Quantidade menor que enviada">Quantidade menor que enviada</option>
                                                <option value="Produto errado">Produto errado</option>
                                                <option value="Produto avariado">Produto avariado</option>
                                                <option value="Qualidade fora do padrão">Qualidade fora do padrão</option>
                                                <option value="Chegou fora do horário combinado">Chegou fora do horário combinado</option>
                                                <option value="Outro">Outro (Adicione comentário no pedido)</option>
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
                        onClick={handleConfirmReceipt}
                        disabled={confirming}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                    >
                        {confirming ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Confirmar Recebimento
                    </button>
                </div>
            </div>
        </div>
    )
}
