'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw, ChefHat, Inbox, Timer, PackageCheck, AlertTriangle, Send, Calculator, ClipboardList, Truck } from 'lucide-react'
import { getOrdersForKitchenAction } from '@/modules/purchases/actions'
import type { PurchaseOrder } from '@/modules/purchases/types'
import { KitchenOrderCard } from './components/KitchenOrderCard'
import toast from 'react-hot-toast'

export default function KitchenPage() {
    const router = useRouter()
    const [orders, setOrders] = useState<PurchaseOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    async function fetchOrders(showRefresh = false) {
        if (showRefresh) setRefreshing(true)
        else setLoading(true)
        setErrorMsg(null)
        const res = await getOrdersForKitchenAction()
        if (res.success) {
            setOrders(res.data ?? [])
        } else {
            setErrorMsg(res.error ?? 'Erro ao carregar pedidos')
            toast.error(res.error ?? 'Erro ao carregar pedidos')
        }
        setLoading(false)
        setRefreshing(false)
    }

    useEffect(() => { fetchOrders() }, [])

    const enviados = orders.filter(o => o.status === 'enviado')
    const emAndamento = orders.filter(o => ['em_analise', 'em_separacao'].includes(o.status))
    const separadosHoje = orders.filter(o => o.status === 'separado')
    const divergentes = orders.filter(o => o.status === 'divergente')

    return (
        <div className="min-h-screen bg-[#F8F7F4]">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
                <div className="max-w-md lg:max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors shrink-0">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-sm font-black text-gray-900 leading-none truncate">Cozinha Central</h1>
                            <p className="text-[10px] text-gray-400 mt-1 font-bold truncate">Painel operacional da Cozinha Central</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            onClick={() => fetchOrders(true)}
                            disabled={refreshing}
                            className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors bg-gray-50"
                        >
                            <RefreshCw className={`w-4 h-4 text-orange-600 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-md lg:max-w-4xl mx-auto px-4 py-6 space-y-10 pb-32">
                
                {/* ── SEÇÃO: Rotina da Cozinha Central ────────────────── */}
                <section className="space-y-4">
                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">
                        Rotina da Cozinha Central
                    </h2>
                    
                    <div className="space-y-3">
                        {/* Card Principal: Contagem */}
                        <button
                            onClick={() => router.push('/dashboard/kitchen/count')}
                            className="w-full bg-gradient-to-br from-orange-500 to-orange-700 p-6 rounded-[32px] flex items-center text-left shadow-xl shadow-orange-200/50 space-x-4 active:scale-[0.98] transition-all"
                        >
                            <div className="bg-white/20 p-4 rounded-2xl shrink-0">
                                <ClipboardList className="w-8 h-8 text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="text-orange-200 text-[10px] font-black uppercase tracking-widest mb-0.5">
                                    Estoque Físico
                                </p>
                                <h3 className="font-black text-white text-xl leading-tight">
                                    Contagem da Cozinha Central
                                </h3>
                                <p className="text-orange-100 text-xs mt-1 leading-relaxed opacity-90">
                                    Insumos, espetos, carnes, frios e descartáveis.
                                </p>
                            </div>
                            <div className="bg-white/10 px-3 py-1.5 rounded-xl shrink-0 hidden sm:block">
                                <span className="text-white text-[10px] font-black uppercase tracking-widest">Abrir →</span>
                            </div>
                        </button>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Recebimentos */}
                            <button
                                onClick={() => router.push('/dashboard/kitchen/receivings')}
                                className="bg-white p-5 rounded-[28px] flex items-center text-left border-2 border-gray-100 shadow-sm space-x-4 active:scale-[0.97] transition-all hover:border-blue-200"
                            >
                                <div className="bg-blue-50 p-3 rounded-xl shrink-0">
                                    <Truck className="w-6 h-6 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-black text-gray-900 text-base leading-tight truncate">
                                        Recebimentos
                                    </h3>
                                    <p className="text-gray-400 text-[10px] font-bold mt-0.5 uppercase tracking-wider">Entregas da Semana</p>
                                </div>
                            </button>

                            {/* Histórico */}
                            <button
                                onClick={() => router.push('/dashboard/kitchen/history')}
                                className="bg-white p-5 rounded-[28px] flex items-center text-left border-2 border-gray-100 shadow-sm space-x-4 active:scale-[0.97] transition-all hover:border-orange-200"
                            >
                                <div className="bg-orange-50 p-3 rounded-xl shrink-0">
                                    <Timer className="w-6 h-6 text-orange-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-black text-gray-900 text-base leading-tight truncate">
                                        Histórico
                                    </h3>
                                    <p className="text-gray-400 text-[10px] font-bold mt-0.5 uppercase tracking-wider">Contagens Anteriores</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </section>

                {/* ── SEÇÃO: Planejamento e Decisão ───────────────────── */}
                <section className="space-y-4">
                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">
                        Planejamento e Decisão
                    </h2>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Planejamento de Produção */}
                        <button
                            onClick={() => router.push('/dashboard/kitchen/planning')}
                            className="bg-white p-5 rounded-[28px] flex items-center text-left border-2 border-orange-100 shadow-lg shadow-orange-100/10 space-x-4 active:scale-[0.97] transition-all hover:border-orange-300"
                        >
                            <div className="bg-orange-50 p-3 rounded-xl shrink-0">
                                <Calculator className="w-6 h-6 text-orange-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-black text-gray-900 text-base leading-tight truncate">
                                    Planejamento
                                </h3>
                                <p className="text-orange-400 text-[10px] font-bold mt-0.5 uppercase tracking-wider">Produção Necessária</p>
                            </div>
                        </button>

                        {/* Estoque das Lojas */}
                        <button
                            onClick={() => router.push('/dashboard/kitchen/store-stock')}
                            className="bg-white p-5 rounded-[28px] flex items-center text-left border-2 border-gray-100 shadow-sm space-x-4 active:scale-[0.97] transition-all hover:border-orange-200"
                        >
                            <div className="bg-gray-50 p-3 rounded-xl shrink-0">
                                <PackageCheck className="w-6 h-6 text-gray-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-black text-gray-900 text-base leading-tight truncate">
                                    Estoque Lojas
                                </h3>
                                <p className="text-gray-400 text-[10px] font-bold mt-0.5 uppercase tracking-wider">Visão da Rede</p>
                            </div>
                        </button>
                    </div>
                </section>

                {/* ── SEÇÃO: Pedidos de Abastecimento ─────────────────── */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                            Pedidos de Abastecimento
                        </h2>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
                                <Send className="w-4 h-4 text-blue-600" />
                            </div>
                            <p className="text-2xl font-black text-gray-900 leading-none">{enviados.length}</p>
                            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">Enviados</p>
                        </div>
                        
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center mb-3">
                                <Timer className="w-4 h-4 text-amber-600" />
                            </div>
                            <p className="text-2xl font-black text-gray-900 leading-none">{emAndamento.length}</p>
                            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">Em Separação</p>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center mb-3">
                                <PackageCheck className="w-4 h-4 text-emerald-600" />
                            </div>
                            <p className="text-2xl font-black text-gray-900 leading-none">{separadosHoje.length}</p>
                            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">Separados</p>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center mb-3">
                                <AlertTriangle className="w-4 h-4 text-red-600" />
                            </div>
                            <p className="text-2xl font-black text-gray-900 leading-none">{divergentes.length}</p>
                            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">Divergentes</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-32 bg-white rounded-3xl border border-gray-100 animate-pulse shadow-sm" />
                            ))}
                        </div>
                    ) : errorMsg ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-20 h-20 bg-red-50 rounded-[32px] flex items-center justify-center mb-6">
                                <AlertTriangle className="w-10 h-10 text-red-500" />
                            </div>
                            <h3 className="text-lg font-black text-gray-900 mb-2">Acesso Negado</h3>
                            <p className="text-sm text-gray-500 max-w-[280px]">Usuário sem permissão para acessar a Cozinha Central.</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-20 h-20 bg-orange-50 rounded-[32px] flex items-center justify-center mb-6">
                                <Inbox className="w-10 h-10 text-orange-200" />
                            </div>
                            <h3 className="text-lg font-black text-gray-900 mb-2">Fila de pedidos vazia</h3>
                            <p className="text-sm text-gray-400 max-w-[240px]">Nenhum pedido de abastecimento aguardando separação.</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Divergências para apurar */}
                            {divergentes.length > 0 && (
                                <section>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-1 flex-1 bg-red-100 rounded-full" />
                                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest whitespace-nowrap">
                                            Divergências para apurar · {divergentes.length}
                                        </span>
                                        <div className="h-1 flex-1 bg-red-100 rounded-full" />
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {divergentes.map(o => (
                                            <KitchenOrderCard key={o.id} order={o} onUpdate={() => fetchOrders(true)} />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Novos */}
                            {enviados.length > 0 && (
                                <section>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-1 flex-1 bg-gray-100 rounded-full" />
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                            Novos Pedidos · {enviados.length}
                                        </span>
                                        <div className="h-1 flex-1 bg-gray-100 rounded-full" />
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {enviados.map(o => (
                                            <KitchenOrderCard key={o.id} order={o} onUpdate={() => fetchOrders(true)} />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Em andamento */}
                            {emAndamento.length > 0 && (
                                <section>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-1 flex-1 bg-gray-100 rounded-full" />
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                            Em Separação · {emAndamento.length}
                                        </span>
                                        <div className="h-1 flex-1 bg-gray-100 rounded-full" />
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {emAndamento.map(o => (
                                            <KitchenOrderCard key={o.id} order={o} onUpdate={() => fetchOrders(true)} />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Separados */}
                            {separadosHoje.length > 0 && (
                                <section>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-1 flex-1 bg-gray-100 rounded-full" />
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                            Separados Hoje · {separadosHoje.length}
                                        </span>
                                        <div className="h-1 flex-1 bg-gray-100 rounded-full" />
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {separadosHoje.map(o => (
                                            <KitchenOrderCard key={o.id} order={o} onUpdate={() => fetchOrders(true)} />
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}
