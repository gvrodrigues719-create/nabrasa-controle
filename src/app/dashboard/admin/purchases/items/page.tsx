'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft, Plus, Package, AlertTriangle, Search,
    Filter, RefreshCw, ChevronRight, ToggleLeft, ToggleRight
} from 'lucide-react'
import { getPurchaseItemsAction, updatePurchaseItemAction } from '@/modules/purchases/actions'
import type { PurchaseItem } from '@/modules/purchases/types'
import { ITEM_CATEGORIES } from '@/modules/purchases/types'
import toast from 'react-hot-toast'

export default function AdminPurchaseItemsPage() {
    const router = useRouter()
    const [items, setItems] = useState<PurchaseItem[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState('')
    const [showInactive, setShowInactive] = useState(false)
    const [showPendingOnly, setShowPendingOnly] = useState(false)
    const [toggling, setToggling] = useState<string | null>(null)

    async function fetchItems() {
        setLoading(true)
        const res = await getPurchaseItemsAction({ includeInactive: true, search: search || undefined, category: category || undefined })
        setItems(res.data ?? [])
        setLoading(false)
    }

    useEffect(() => { fetchItems() }, [search, category])

    async function handleToggleActive(item: PurchaseItem) {
        setToggling(item.id)
        const res = await updatePurchaseItemAction(item.id, { is_active: !item.is_active })
        if (res.success) {
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: !i.is_active } : i))
        } else {
            toast.error(res.error ?? 'Erro ao atualizar')
        }
        setToggling(null)
    }

    const filtered = items.filter(item => {
        if (!showInactive && !item.is_active) return false
        if (showPendingOnly && !item.pending_review) return false
        return true
    })

    const pendingCount = items.filter(i => i.pending_review).length
    const inactiveCount = items.filter(i => !i.is_active).length

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
                            <h1 className="text-sm font-black text-gray-900 leading-none">Catálogo de Itens</h1>
                            <p className="text-[10px] text-gray-400 mt-0.5">{items.length} itens · {pendingCount} pendentes</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={fetchItems} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={() => router.push('/dashboard/admin/purchases/items/new')}
                            className="flex items-center gap-1.5 bg-gray-900 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 hover:bg-gray-700"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Novo
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 py-4 space-y-4 pb-24">

                {/* Pending review alert */}
                {pendingCount > 0 && (
                    <button
                        onClick={() => setShowPendingOnly(v => !v)}
                        className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all ${showPendingOnly
                            ? 'bg-amber-500 border-amber-500 text-white'
                            : 'bg-amber-50 border-amber-100 text-amber-700'}`}
                    >
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <div className="text-left flex-1">
                            <p className="text-xs font-black uppercase tracking-widest">
                                {pendingCount} {pendingCount === 1 ? 'item pendente' : 'itens pendentes'} de revisão
                            </p>
                            <p className="text-[10px] mt-0.5 opacity-80">
                                Sem mín/máx ou mín &gt; máx — configure antes de usar
                            </p>
                        </div>
                        <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${showPendingOnly ? 'rotate-90' : ''}`} />
                    </button>
                )}

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar item..."
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 shadow-sm"
                    />
                </div>

                {/* Filters row */}
                <div className="flex items-center gap-2">
                    <div className="flex gap-2 flex-1 overflow-x-auto pb-1 scrollbar-hide">
                        <button
                            onClick={() => setCategory('')}
                            className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!category ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-500'}`}
                        >
                            Todos
                        </button>
                        {ITEM_CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCategory(c => c === cat ? '' : cat)}
                                className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${category === cat ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-500'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Toggles */}
                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        onClick={() => setShowInactive(v => !v)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showInactive ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-500'}`}
                    >
                        {showInactive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                        {showInactive ? 'Mostrando inativos' : `Ver inativos (${inactiveCount})`}
                    </button>
                </div>

                {/* List */}
                {loading ? (
                    <div className="space-y-2">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Package className="w-10 h-10 text-gray-200 mb-3" />
                        <p className="text-sm font-bold text-gray-400">Nenhum item encontrado</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filtered.map(item => (
                            <div
                                key={item.id}
                                className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${!item.is_active ? 'opacity-50' : ''} ${item.pending_review ? 'border-amber-200' : 'border-gray-100'}`}
                            >
                                <button
                                    onClick={() => router.push(`/dashboard/admin/purchases/items/${item.id}`)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group text-left"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-black text-gray-900 truncate">{item.name}</span>
                                            {item.pending_review && (
                                                <span className="shrink-0 flex items-center gap-1 text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full">
                                                    <AlertTriangle className="w-2.5 h-2.5" />
                                                    Revisar
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[10px] bg-gray-50 border border-gray-100 text-gray-500 px-2 py-0.5 rounded-md font-bold">{item.category}</span>
                                            <span className="text-[10px] text-gray-400">{item.order_unit}</span>
                                            {item.allows_decimal && <span className="text-[10px] text-indigo-500 font-bold">decimal</span>}
                                            {item.min_stock !== null && item.max_stock !== null && (
                                                <span className="text-[10px] text-gray-400">mín {item.min_stock} · máx {item.max_stock}</span>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-700 transition-colors shrink-0 ml-2" />
                                </button>

                                <div className="border-t border-gray-50 px-4 py-2 flex items-center justify-between">
                                    <button
                                        onClick={() => handleToggleActive(item)}
                                        disabled={toggling === item.id}
                                        className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${item.is_active ? 'text-emerald-600 hover:text-red-500' : 'text-gray-400 hover:text-emerald-600'}`}
                                    >
                                        {toggling === item.id
                                            ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            : item.is_active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                                        {item.is_active ? 'Ativo' : 'Inativo'}
                                    </button>
                                    <span className={`text-[10px] font-bold ${item.origin === 'cozinha_central' ? 'text-orange-500' : 'text-blue-500'}`}>
                                        {item.origin === 'cozinha_central' ? 'Cozinha Central' : 'Fornecedor Externo'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
