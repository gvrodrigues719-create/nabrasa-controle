'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, Filter, ChevronRight } from 'lucide-react'
import type { PurchaseItem } from '@/modules/purchases/types'
import { getPurchaseItemsAction } from '@/modules/purchases/actions'

interface ItemSearchDrawerProps {
    isOpen: boolean
    onClose: () => void
    onAddItems: (items: { item: PurchaseItem, qty: number }[]) => void
    excludeItemIds?: string[]
}

const CATEGORY_GROUPS = [
  {
    key: 'todos',
    label: 'Todos',
    rawCategories: [],
    color: {
      active: 'bg-slate-900 text-white',
      inactive: 'bg-slate-100 text-slate-600 hover:bg-slate-200',
      dot: 'bg-slate-500'
    }
  },
  {
    key: 'proteinas',
    label: 'Proteínas',
    rawCategories: ['PROTEÍNAS', 'ESPETOS'],
    color: {
      active: 'bg-red-600 text-white',
      inactive: 'bg-red-50 text-red-700 hover:bg-red-100',
      dot: 'bg-red-500'
    }
  },
  {
    key: 'hortifruti',
    label: 'Hortifruti',
    rawCategories: ['HORTIFRUTI'],
    color: {
      active: 'bg-green-600 text-white',
      inactive: 'bg-green-50 text-green-700 hover:bg-green-100',
      dot: 'bg-green-500'
    }
  },
  {
    key: 'laticinios',
    label: 'Laticínios',
    rawCategories: ['LATICÍNIOS E OVOS'],
    color: {
      active: 'bg-yellow-500 text-white',
      inactive: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100',
      dot: 'bg-yellow-400'
    }
  },
  {
    key: 'graos_secos',
    label: 'Mercearia',
    rawCategories: ['MERCEARIA', 'COZINHA CENTRAL - BASES'],
    color: {
      active: 'bg-amber-600 text-white',
      inactive: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
      dot: 'bg-amber-500'
    }
  },
  {
    key: 'molhos_condimentos',
    label: 'Molhos',
    rawCategories: ['COZINHA CENTRAL - MOLHOS', 'CONDIMENTOS', 'TEMPEROS'],
    color: {
      active: 'bg-orange-600 text-white',
      inactive: 'bg-orange-50 text-orange-700 hover:bg-orange-100',
      dot: 'bg-orange-500'
    }
  },
  {
    key: 'descartaveis',
    label: 'Descartáveis',
    rawCategories: ['DESCARTÁVEIS'],
    color: {
      active: 'bg-sky-600 text-white',
      inactive: 'bg-sky-50 text-sky-700 hover:bg-sky-100',
      dot: 'bg-sky-500'
    }
  },
  {
    key: 'limpeza',
    label: 'Limpeza',
    rawCategories: ['LIMPEZA', 'INSUMOS OPERACIONAIS'],
    color: {
      active: 'bg-cyan-600 text-white',
      inactive: 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100',
      dot: 'bg-cyan-500'
    }
  },
  {
    key: 'bebidas',
    label: 'Bebidas',
    rawCategories: ['BEBIDAS', 'DESTILADOS E VINHOS'],
    color: {
      active: 'bg-blue-600 text-white',
      inactive: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
      dot: 'bg-blue-500'
    }
  },
  {
    key: 'funcionario',
    label: 'Funcionário',
    rawCategories: ['FUNCIONÁRIO'],
    color: {
      active: 'bg-purple-600 text-white',
      inactive: 'bg-purple-50 text-purple-700 hover:bg-purple-100',
      dot: 'bg-purple-500'
    }
  },
  {
    key: 'outros',
    label: 'Outros',
    rawCategories: ['ENTRADAS', 'LANCHES', 'SOBREMESAS', 'CONGELADOS'],
    color: {
      active: 'bg-zinc-600 text-white',
      inactive: 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
      dot: 'bg-zinc-500'
    }
  }
]

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeCategory(cat: string) {
    return cat.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "")
}

function getCategoryGroup(rawCat: string) {
    const normalized = normalizeCategory(rawCat)
    const found = CATEGORY_GROUPS.find(g => g.key !== 'todos' && g.rawCategories.map(normalizeCategory).includes(normalized))
    return found || CATEGORY_GROUPS.find(g => g.key === 'outros')!
}

export function ItemSearchDrawer({
    isOpen,
    onClose,
    onAddItems,
    excludeItemIds = [],
}: ItemSearchDrawerProps) {
    const [search, setSearch] = useState('')
    const [selectedGroupKey, setSelectedGroupKey] = useState<string>('todos')
    const [items, setItems] = useState<PurchaseItem[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedItems, setSelectedItems] = useState<Record<string, { item: PurchaseItem, qty: number }>>({})
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
            setSelectedGroupKey('todos')
            setSelectedItems({})
        }
    }, [isOpen])

    const filtered = items.filter(item => {
        if (excludeItemIds.includes(item.id)) return false
        
        if (selectedGroupKey !== 'todos') {
            const normalizedItemCat = normalizeCategory(item.category)
            const group = CATEGORY_GROUPS.find(g => g.key === selectedGroupKey)
            if (group) {
                const groupRaws = group.rawCategories.map(normalizeCategory)
                if (!groupRaws.includes(normalizedItemCat)) return false
            }
        }
        
        if (search) {
            const normalizedSearch = normalizeText(search)
            const queryTerms = normalizedSearch.split(' ').filter(Boolean)
            const normalizedItemName = normalizeText(item.name)
            const normalizedItemCat = normalizeText(item.category)

            return queryTerms.every(term => 
                normalizedItemName.includes(term) || 
                normalizedItemCat.includes(term)
            )
        }
        return true
    })

    const grouped = filtered.reduce<Record<string, PurchaseItem[]>>((acc, item) => {
        if (!acc[item.category]) acc[item.category] = []
        acc[item.category].push(item)
        return acc
    }, {})

    function handleQtyChange(item: PurchaseItem, delta: number) {
        setSelectedItems(prev => {
            const current = prev[item.id]?.qty || 0
            const step = item.allows_decimal ? 0.5 : 1
            const newQty = current + (delta * step)
            
            if (newQty <= 0) {
                const copy = { ...prev }
                delete copy[item.id]
                return copy
            }
            return { ...prev, [item.id]: { item, qty: newQty } }
        })
    }

    function handleManualQtyChange(item: PurchaseItem, val: string) {
        const numericVal = item.allows_decimal ? parseFloat(val.replace(',', '.')) : parseInt(val)
        
        setSelectedItems(prev => {
            if (isNaN(numericVal) || numericVal <= 0) {
                const copy = { ...prev }
                delete copy[item.id]
                return copy
            }
            return { ...prev, [item.id]: { item, qty: numericVal } }
        })
    }

    const selectedArray = Object.values(selectedItems)
    const totalSelected = selectedArray.length

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
                        {CATEGORY_GROUPS.map(g => {
                            const isActive = selectedGroupKey === g.key
                            return (
                                <button
                                    key={g.key}
                                    onClick={() => setSelectedGroupKey(isActive && g.key !== 'todos' ? 'todos' : g.key)}
                                    className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                        isActive ? g.color.active : g.color.inactive
                                    }`}
                                >
                                    {g.label}
                                </button>
                            )
                        })}
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
                                    {catItems.map(item => {
                                        const group = getCategoryGroup(item.category)
                                        const qty = selectedItems[item.id]?.qty || 0
                                        return (
                                            <div
                                                key={item.id}
                                                className={`w-full flex items-center justify-between px-5 py-3.5 transition-colors border-b border-gray-50 ${qty > 0 ? 'bg-orange-50/50' : 'hover:bg-gray-50'}`}
                                            >
                                                <div className="text-left flex-1" onClick={() => qty === 0 && handleQtyChange(item, 1)}>
                                                    <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full ${group.color.dot}`} />
                                                        {item.name}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 mt-0.5 ml-4">
                                                        {item.order_unit} · {item.origin === 'cozinha_central' ? 'Cozinha Central' : 'Fornecedor Externo'}
                                                    </p>
                                                </div>
                                                
                                                <div className="flex items-center gap-3 shrink-0 ml-4 bg-white rounded-lg border border-gray-200 p-1">
                                                    <button 
                                                        onClick={() => handleQtyChange(item, -1)}
                                                        className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-md active:bg-gray-200 transition-colors"
                                                    >
                                                        <span className="text-lg font-bold leading-none mb-0.5">-</span>
                                                    </button>
                                                    <input
                                                        type="number"
                                                        value={qty > 0 ? qty : ''}
                                                        placeholder="0"
                                                        onChange={(e) => handleManualQtyChange(item, e.target.value)}
                                                        className="w-10 text-center text-sm font-black text-gray-900 bg-transparent border-none focus:outline-none"
                                                    />
                                                    <button 
                                                        onClick={() => handleQtyChange(item, 1)}
                                                        className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-md active:bg-gray-200 transition-colors"
                                                    >
                                                        <span className="text-lg font-bold leading-none mb-0.5">+</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer fixed */}
                {totalSelected > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-8px_24px_rgba(0,0,0,0.05)] rounded-b-3xl">
                        <div className="flex items-center justify-between mb-3 px-2">
                            <span className="text-sm font-black text-gray-900">{totalSelected} ite{totalSelected > 1 ? 'ns' : 'm'} selecionado{totalSelected > 1 ? 's' : ''}</span>
                        </div>
                        <button
                            onClick={() => {
                                onAddItems(selectedArray)
                                onClose()
                            }}
                            className="w-full bg-[#B13A2B] hover:bg-[#8F2E21] text-white py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98]"
                        >
                            Adicionar ao pedido
                        </button>
                    </div>
                )}
            </div>
        </>
    )
}
