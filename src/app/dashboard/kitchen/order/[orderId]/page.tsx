'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
    ArrowLeft, CheckCircle2, Package, Clock, 
    ChefHat, AlertTriangle, Loader2, Play, 
    Square, Trash2
} from 'lucide-react'
import { getProductionOrderAction, completeProductionOrderAction } from '@/modules/purchases/production-actions'
import toast from 'react-hot-toast'

export default function ProductionOrderExecutionPage() {
    const router = useRouter()
    const { orderId } = useParams()
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [order, setOrder] = useState<any>(null)
    const [itemStates, setItemStates] = useState<Record<string, { produced: number; lost: number; done: boolean }>>({})

    useEffect(() => {
        async function fetchOrder() {
            setLoading(true)
            const res = await getProductionOrderAction(orderId as string)
            if (res.success) {
                setOrder(res.data)
                const initial: Record<string, any> = {}
                res.data.production_order_items.forEach((i: any) => {
                    initial[i.item_id] = { 
                        produced: i.produced_qty || i.approved_qty, 
                        lost: i.lost_qty || 0,
                        done: i.status === 'produced'
                    }
                })
                setItemStates(initial)
            } else {
                toast.error(res.error || 'Erro ao carregar ordem')
            }
            setLoading(false)
        }
        fetchOrder()
    }, [orderId])

    const updateItem = (itemId: string, field: 'produced' | 'lost' | 'done', val: any) => {
        if (order?.status === 'completed') return
        setItemStates(prev => ({
            ...prev,
            [itemId]: { ...prev[itemId], [field]: val }
        }))
    }

    const allProduced = order?.production_order_items.every((i: any) => itemStates[i.item_id]?.done)

    async function handleComplete() {
        if (!allProduced) {
            toast.error('Marque todos os itens como concluídos')
            return
        }

        setSubmitting(true)
        const items = order.production_order_items.map((i: any) => ({
            item_id: i.item_id,
            produced_qty: itemStates[i.item_id].produced,
            lost_qty: itemStates[i.item_id].lost
        }))

        const res = await completeProductionOrderAction(orderId as string, items)
        if (res.success) {
            toast.success('Produção concluída e estoque atualizado!')
            router.push('/dashboard')
        } else {
            toast.error(res.error || 'Erro ao finalizar')
        }
        setSubmitting(false)
    }

    if (loading) return (
        <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        </div>
    )

    if (!order) return null

    return (
        <div className="min-h-screen bg-[#FDFCFB] pb-32">
            <header className="sticky top-0 z-40 bg-white border-b border-gray-100 h-16 flex items-center justify-between px-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-base font-black text-gray-900 leading-none">Produção em Execução</h1>
                        <p className="text-[10px] text-gray-400 mt-1 font-bold">ORDEM #{order.id.slice(0, 8)}</p>
                    </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    order.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                }`}>
                    {order.status === 'completed' ? 'Concluída' : 'Executando'}
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
                
                {order.production_order_items.map((item: any) => {
                    const state = itemStates[item.item_id]
                    return (
                        <div key={item.id} className={`bg-white rounded-[32px] border transition-all overflow-hidden ${
                            state.done ? 'border-emerald-100 bg-emerald-50/20' : 'border-gray-100 shadow-sm'
                        }`}>
                            <div className="p-6 space-y-6">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{item.purchase_items?.category}</p>
                                        <h3 className="text-lg font-black text-gray-900">{item.purchase_items?.name}</h3>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">Planejado: {item.planned_qty} {item.unit || item.purchase_items?.order_unit}</span>
                                            <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">Aprovado: {item.approved_qty} {item.unit || item.purchase_items?.order_unit}</span>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={() => updateItem(item.item_id, 'done', !state.done)}
                                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                                            state.done ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                        }`}
                                    >
                                        <CheckCircle2 className="w-6 h-6" />
                                    </button>
                                </div>

                                {!state.done && (
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Real Produzido</p>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number"
                                                    value={state.produced}
                                                    onChange={(e) => updateItem(item.item_id, 'produced', parseFloat(e.target.value) || 0)}
                                                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-orange-500/20 transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">Perda / Desperdício</p>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number"
                                                    value={state.lost}
                                                    onChange={(e) => updateItem(item.item_id, 'lost', parseFloat(e.target.value) || 0)}
                                                    className="w-full bg-rose-50/50 border-none rounded-xl px-4 py-3 text-sm font-black text-rose-700 focus:ring-2 focus:ring-rose-500/20 transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}

                <div className="bg-orange-50 p-6 rounded-[32px] border border-orange-100 flex gap-4">
                    <Info className="w-6 h-6 text-orange-500 shrink-0" />
                    <div className="space-y-1">
                        <p className="text-sm font-black text-orange-900">Critério de Conclusão</p>
                        <p className="text-xs text-orange-700 leading-relaxed font-medium">
                            Informe a quantidade real produzida e registre eventuais perdas. 
                            Ao finalizar, as reservas de insumo serão baixadas e o produto acabado entrará no estoque.
                        </p>
                    </div>
                </div>
            </main>

            <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-gray-100">
                <div className="max-w-2xl mx-auto">
                    <button 
                        onClick={handleComplete}
                        disabled={!allProduced || submitting}
                        className={`w-full py-5 rounded-[24px] text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${
                            allProduced 
                                ? 'bg-orange-600 text-white shadow-xl shadow-orange-500/20' 
                                : 'bg-gray-100 text-gray-400 grayscale'
                        }`}
                    >
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                        Concluir Tarefa de Produção
                    </button>
                </div>
            </div>
        </div>
    )
}

function Info({ className }: { className?: string }) {
    return (
        <div className={className}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        </div>
    )
}
