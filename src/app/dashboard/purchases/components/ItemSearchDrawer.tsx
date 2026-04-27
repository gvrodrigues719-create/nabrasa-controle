'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, Filter, ChevronRight } from 'lucide-react'
import type { PurchaseItem } from '@/modules/purchases/types'
import { ITEM_CATEGORIES } from '@/modules/purchases/types'
import { getPurchaseItemsAction } from '@/modules/purchases/actions'

interface ItemSearchDrawerProps {
    isOpen: boolean
    onClose: () => void
    onSelectItem: (item: PurchaseItem) => void
    excludeItemIds?: string[]
}

export function ItemSearchDrawer({
    isOpen,
    onClose,
    onSelectItem,
    excludeItemIds = [],
}: ItemSearchDrawerProps) {
    const [search, setSearch] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('')
    const [items, setItems] = useState<PurchaseItem[]>([])
    const [loading, setLoading] = useState(false)
    const searchRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isOpen) {
            setLoading(true)
            getPurchaseItemsAction().then(res => {
                setItems(res.data ?? [])
                setLoading(false)
            })
            setTimeout(() => searchRef.current?.focus(), 300)
        } else {
            setSearch('')
            setSelectedCategory('')
        }
    }, [isOpen])

    const filtered = items.filter(item => {
        if (excludeItemIds.includes(item.id)) return false
        if (selectedCategory && item.category !== selectedCategory) return false
        if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false
        return true
    })

    const grouped = filtered.reduce<Record<string, PurchaseItem[]>>((acc, item) => {
        if (!acc[item.category]) acc[item.category] = []
        acc[item.category].push(item)
        return acc
    }, {})

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
                style={{ maxHeight: '90dvh' }}
            >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 bg-gray-200 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-5 pb-4 pt-2 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-black text-gray-900">Adicionar Item</h3>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            <X className="w-4 h-4 text-gray-600" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            ref={searchRef}
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar item..."
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                                <X className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                        )}
                    </div>

                    {/* Category filters */}
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
                        <button
                            onClick={() => setSelectedCategory('')}
                            className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!selectedCategory
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                            Todos
                        </button>
                        {ITEM_CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                                className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Item list */}
                <div className="overflow-y-auto" style={{ maxHeight: 'calc(90dvh - 220px)' }}>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                                <Search className="w-5 h-5 text-gray-400" />
                            </div>
                            <p className="text-sm font-bold text-gray-500">Nenhum item encontrado</p>
                            <p className="text-xs text-gray-400 mt-1">Tente outro termo ou categoria</p>
                        </div>
                    ) : (
                        <div className="pb-8">
                            {Object.entries(grouped).map(([category, catItems]) => (
                                <div key={category}>
                                    <div className="px-5 py-2 bg-gray-50/80">
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{category}</span>
                                    </div>
                                    {catItems.map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => { onSelectItem(item); onClose() }}
                                            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-orange-50 transition-colors border-b border-gray-50 active:bg-orange-100 group"
                                        >
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-gray-900">{item.name}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">
                                                    {item.order_unit} · {item.origin === 'cozinha_central' ? 'Cozinha Central' : 'Fornecedor Externo'}
                                                </p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-orange-500 transition-colors shrink-0" />
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
