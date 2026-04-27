'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ShoppingCart, Package, ChevronRight, ArrowLeft, RefreshCw, FilterX } from 'lucide-react'
import Link from 'next/link'
import { getOrdersForStoreAction, createPurchaseOrderAction } from '@/modules/purchases/actions'
import type { PurchaseOrder, OrderStatus } from '@/modules/purchases/types'
import { ORDER_STATUS_CONFIG } from '@/modules/purchases/types'
import { OrderCard } from './components/OrderCard'
import toast from 'react-hot-toast'

const STATUS_FILTERS: { label: string; values: OrderStatus[] }[] = [
    { label: 'Todos', values: [] },
    { label: 'Rascunho', values: ['rascunho'] },
    { label: 'Enviados', values: ['enviado', 'em_analise', 'em_separacao', 'separado', 'em_entrega'] },
    { label: 'Entregues', values: ['entregue', 'recebido'] },
    { label: 'Divergências', values: ['divergente'] },
    { label: 'Cancelados', values: ['cancelado'] },
]

export default function PurchasesPage() {
    const router = useRouter()
    const [allOrders, setAllOrders] = useState<PurchaseOrder[]>([])
    const [storeName, setStoreName] = useState<string>('Loja')
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [activeFilter, setActiveFilter] = useState(0)
    const [refreshKey, setRefreshKey] = useState(0)

    useEffect(() => {
        setLoading(true)
        getOrdersForStoreAction()
            .then(res => {
                setAllOrders(res.data ?? [])
                if (res.storeName) setStoreName(res.storeName)
                setLoading(false)
            })
    }, [refreshKey])

    const filterValues = STATUS_FILTERS[activeFilter].values
    const orders = filterValues.length > 0
        ? allOrders.filter(o => filterValues.includes(o.status))
        : allOrders

    async function handleNewOrder() {
        setCreating(true)
        const res = await createPurchaseOrderAction()
        if (res.success && res.data) {
            router.push(`/dashboard/purchases/${res.data.id}`)
        } else {
            toast.error(res.error ?? 'Erro ao criar pedido')
            setCreating(false)
        }
    }

    const drafts = orders.filter(o => o.status === 'rascunho')
    const active = orders.filter(o => !['rascunho', 'recebido', 'cancelado', 'divergente'].includes(o.status))
    const done = orders.filter(o => ['recebido', 'divergente', 'cancelado'].includes(o.status))

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
                            <h1 className="text-sm font-black text-gray-900 leading-none">Pedidos de Abastecimento</h1>
                            <p className="text-[10px] text-gray-400 mt-0.5">{storeName} — pedidos para a Cozinha Central</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setRefreshKey(k => k + 1)}
                            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={handleNewOrder}
                            disabled={creating}
                            className="flex items-center gap-2 bg-[#B13A2B] hover:bg-[#8F2E21] text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-60"
                        >
                            {creating ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4" />
                            )}
                            Novo
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 py-5 space-y-5 pb-28">

                {/* Status filter chips */}
                <div className="flex gap-2 overflow-x-auto sm:flex-wrap pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
                    {STATUS_FILTERS.map((f, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveFilter(i)}
                            className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${i === activeFilter
                                ? 'bg-gray-900 text-white shadow-sm'
                                : 'bg-white border border-gray-100 text-gray-500 hover:border-gray-200'}`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {!loading && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                            <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rascunhos</span>
                            <span className="block text-2xl font-black text-gray-900 leading-none">{allOrders.filter(o => o.status === 'rascunho').length}</span>
                        </div>
                        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                            <span className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Enviados</span>
                            <span className="block text-2xl font-black text-gray-900 leading-none">{allOrders.filter(o => ['enviado', 'em_analise', 'em_separacao'].includes(o.status)).length}</span>
                        </div>
                        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                            <span className="block text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Aguardando</span>
                            <span className="block text-2xl font-black text-gray-900 leading-none">{allOrders.filter(o => ['separado', 'em_entrega'].includes(o.status)).length}</span>
                        </div>
                        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                            <span className="block text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Divergentes</span>
                            <span className="block text-2xl font-black text-gray-900 leading-none">{allOrders.filter(o => o.status === 'divergente').length}</span>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />
                        ))}
                    </div>
                ) : orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 bg-orange-50 rounded-3xl flex items-center justify-center mb-4">
                            <ShoppingCart className="w-8 h-8 text-orange-400" />
                        </div>
                        <h3 className="text-sm font-black text-gray-700 mb-1">
                            {activeFilter === 0 ? 'Nenhum pedido ainda' : 'Nenhum pedido aqui'}
                        </h3>
                        <p className="text-xs text-gray-400 mb-6 max-w-[200px]">
                            {activeFilter === 0
                                ? 'Crie seu primeiro pedido de abastecimento'
                                : 'Tente outro filtro de status'}
                        </p>
                        {activeFilter === 0 && (
                            <button
                                onClick={handleNewOrder}
                                disabled={creating}
                                className="flex items-center gap-2 bg-[#B13A2B] text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                Criar Primeiro Pedido
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Rascunhos em destaque */}
                        {drafts.length > 0 && activeFilter === 0 && (
                            <section>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-1 h-4 bg-gray-300 rounded-full" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rascunhos</span>
                                </div>
                                <div className="space-y-2">
                                    {drafts.map(o => <OrderCard key={o.id} order={o} />)}
                                </div>
                            </section>
                        )}

                        {/* Pedidos ativos em destaque */}
                        {active.length > 0 && activeFilter === 0 && (
                            <section>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-1 h-4 bg-orange-400 rounded-full" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Em Andamento</span>
                                </div>
                                <div className="space-y-2">
                                    {active.map(o => <OrderCard key={o.id} order={o} />)}
                                </div>
                            </section>
                        )}

                        {/* Concluídos */}
                        {done.length > 0 && activeFilter === 0 && (
                            <section>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-1 h-4 bg-gray-200 rounded-full" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Concluídos</span>
                                </div>
                                <div className="space-y-2">
                                    {done.map(o => <OrderCard key={o.id} order={o} />)}
                                </div>
                            </section>
                        )}

                        {/* Lista plana quando filtrando */}
                        {activeFilter !== 0 && (
                            <div className="space-y-2">
                                {orders.map(o => <OrderCard key={o.id} order={o} />)}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
