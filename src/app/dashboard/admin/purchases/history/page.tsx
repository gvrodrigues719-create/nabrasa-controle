'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, ArrowLeft, RefreshCw } from 'lucide-react'
import { getOrdersForStoreAction } from '@/modules/purchases/actions'
import type { PurchaseOrder, OrderStatus } from '@/modules/purchases/types'
import { OrderCard } from '../../../purchases/components/OrderCard'

const STATUS_FILTERS: { label: string; values: OrderStatus[] }[] = [
    { label: 'Todos', values: [] },
    { label: 'Rascunho', values: ['rascunho'] },
    { label: 'Novos / Análise', values: ['enviado', 'em_analise'] },
    { label: 'Separação', values: ['em_separacao', 'separado'] },
    { label: 'Em Entrega', values: ['em_entrega'] },
    { label: 'Entregues', values: ['entregue', 'recebido'] },
    { label: 'Divergências', values: ['divergente'] },
    { label: 'Cancelados', values: ['cancelado'] },
]

export default function AdminPurchasesHistoryPage() {
    const router = useRouter()
    const [allOrders, setAllOrders] = useState<PurchaseOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [activeFilter, setActiveFilter] = useState(0)
    const [refreshKey, setRefreshKey] = useState(0)

    useEffect(() => {
        setLoading(true)
        getOrdersForStoreAction()
            .then(res => {
                setAllOrders(res.data ?? [])
                setLoading(false)
            })
    }, [refreshKey])

    const filterValues = STATUS_FILTERS[activeFilter].values
    const orders = filterValues.length > 0
        ? allOrders.filter(o => filterValues.includes(o.status))
        : allOrders

    return (
        <div className="min-h-screen bg-[#F8F7F4]">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-base font-black text-gray-900 leading-none">Histórico de Pedidos</h1>
                            <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-bold">Visão Gerencial (Todas as Lojas)</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setRefreshKey(k => k + 1)}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 text-indigo-600 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6 space-y-5 pb-28">
                {/* Status filter chips */}
                <div className="flex gap-2 overflow-x-auto sm:flex-wrap pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
                    {STATUS_FILTERS.map((f, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveFilter(i)}
                            className={`shrink-0 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${i === activeFilter
                                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                                : 'bg-white border border-gray-100 text-gray-500 hover:border-gray-200'}`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="grid md:grid-cols-2 gap-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />
                        ))}
                    </div>
                ) : orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-[32px] border border-dashed border-gray-200">
                        <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center mb-4">
                            <ShoppingCart className="w-8 h-8 text-indigo-400" />
                        </div>
                        <h3 className="text-sm font-black text-gray-700 mb-1">
                            {activeFilter === 0 ? 'Nenhum pedido encontrado' : 'Nenhum pedido com este status'}
                        </h3>
                        <p className="text-xs text-gray-400 max-w-[200px]">
                            {activeFilter === 0
                                ? 'Nenhuma loja fez pedidos ainda'
                                : 'Tente outro filtro de status para ver mais pedidos'}
                        </p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-3">
                        {orders.map(o => <OrderCard key={o.id} order={o} basePath="/dashboard/purchases" />)}
                    </div>
                )}
            </div>
        </div>
    )
}
