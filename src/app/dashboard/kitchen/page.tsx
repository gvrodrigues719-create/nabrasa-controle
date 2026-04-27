'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw, ChefHat, Inbox } from 'lucide-react'
import { getOrdersForKitchenAction } from '@/modules/purchases/actions'
import type { PurchaseOrder } from '@/modules/purchases/types'
import { KitchenOrderCard } from './components/KitchenOrderCard'
import toast from 'react-hot-toast'

export default function KitchenPage() {
    const router = useRouter()
    const [orders, setOrders] = useState<PurchaseOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    async function fetchOrders(showRefresh = false) {
        if (showRefresh) setRefreshing(true)
        else setLoading(true)
        const res = await getOrdersForKitchenAction()
        if (res.success) {
            setOrders(res.data ?? [])
        } else {
            toast.error(res.error ?? 'Erro ao carregar pedidos')
        }
        setLoading(false)
        setRefreshing(false)
    }

    useEffect(() => { fetchOrders() }, [])

    const enviados = orders.filter(o => o.status === 'enviado')
    const emAndamento = orders.filter(o => ['em_analise', 'em_separacao'].includes(o.status))
    const separados = orders.filter(o => o.status === 'separado')

    return (
        <div className="min-h-screen bg-[#F8F7F4]">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
                <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center">
                                <ChefHat className="w-4 h-4 text-orange-600" />
                            </div>
                            <div>
                                <h1 className="text-sm font-black text-gray-900 leading-none">Cozinha Central</h1>
                                <p className="text-[10px] text-gray-400 mt-0.5">Fila de Separação</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => fetchOrders(true)}
                        disabled={refreshing}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 py-5 space-y-6 pb-24">
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />
                        ))}
                    </div>
                ) : orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 bg-orange-50 rounded-3xl flex items-center justify-center mb-4">
                            <Inbox className="w-8 h-8 text-orange-300" />
                        </div>
                        <h3 className="text-sm font-black text-gray-600 mb-1">Fila vazia</h3>
                        <p className="text-xs text-gray-400">Nenhum pedido aguardando separação</p>
                    </div>
                ) : (
                    <>
                        {/* Novos — aguardando análise */}
                        {enviados.length > 0 && (
                            <section>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        Novos Pedidos · {enviados.length}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {enviados.map(o => (
                                        <KitchenOrderCard key={o.id} order={o} onUpdate={() => fetchOrders(true)} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Em andamento */}
                        {emAndamento.length > 0 && (
                            <section>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        Em Separação · {emAndamento.length}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {emAndamento.map(o => (
                                        <KitchenOrderCard key={o.id} order={o} onUpdate={() => fetchOrders(true)} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Separados (aguardando entrega) */}
                        {separados.length > 0 && (
                            <section>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        Separados · {separados.length}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {separados.map(o => (
                                        <KitchenOrderCard key={o.id} order={o} onUpdate={() => fetchOrders(true)} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
