'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw, Search, Warehouse, Store, Boxes, ClipboardList, AlertTriangle, ChevronDown, ChevronRight, Clock } from 'lucide-react'
import { getKitchenStoreStockAction } from '@/app/actions/storeStockAction'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface StockItem {
    item_id: string
    item_name: string
    unit: string
    quantity: number
    is_zeroed: boolean
    effective_quantity: number
    counted_at: string
    responsible_name: string
    session_id: string
}

interface StockGroup {
    group_id: string
    group_name: string
    last_count_at: string
    items: StockItem[]
}

interface UnitStock {
    unit_id: string
    unit_name: string
    last_count_at: string
    freshness_status: 'updated' | 'attention' | 'outdated'
    groups: StockGroup[]
}

export default function StoreStockPage() {
    const router = useRouter()
    const [units, setUnits] = useState<UnitStock[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({})
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
    const [filterOnlyZeroed, setFilterOnlyZeroed] = useState(false)

    async function fetchData(showRefresh = false) {
        if (showRefresh) setRefreshing(true)
        else setLoading(true)
        
        const res = await getKitchenStoreStockAction()
        if (res.success) {
            setUnits(res.units ?? [])
            // Expand first unit by default
            if (res.units && res.units.length > 0 && !showRefresh) {
                setExpandedUnits({ [res.units[0].unit_id]: true })
            }
        } else {
            toast.error(res.error ?? 'Erro ao carregar estoque das lojas')
        }
        
        setLoading(false)
        setRefreshing(false)
    }

    useEffect(() => { fetchData() }, [])

    const toggleUnit = (id: string) => {
        setExpandedUnits(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const toggleGroup = (id: string) => {
        setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }))
    }

    // Filtragem de dados
    const filteredUnits = units.map(unit => {
        const filteredGroups = unit.groups.map(group => {
            const filteredItems = group.items.filter(item => {
                const matchesSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase())
                const matchesZeroed = filterOnlyZeroed ? item.is_zeroed : true
                return matchesSearch && matchesZeroed
            })
            return { ...group, items: filteredItems }
        }).filter(group => group.items.length > 0)
        
        return { ...unit, groups: filteredGroups }
    }).filter(unit => unit.groups.length > 0)

    const totalZeroed = units.reduce((acc, u) => 
        acc + u.groups.reduce((gAcc, g) => 
            gAcc + g.items.filter(i => i.is_zeroed).length, 0
        ), 0
    )

    const outdatedUnits = units.filter(u => u.freshness_status === 'outdated').length

    return (
        <div className="min-h-screen bg-[#F8F7F4] pb-20">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button onClick={() => router.push('/dashboard/kitchen')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-sm font-black text-gray-900 leading-none truncate">Estoque das Lojas</h1>
                            <p className="text-[10px] text-gray-400 mt-1 font-bold truncate">Visão consolidada da rede</p>
                        </div>
                    </div>
                    <button
                        onClick={() => fetchData(true)}
                        disabled={refreshing}
                        className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors bg-gray-50"
                    >
                        <RefreshCw className={`w-4 h-4 text-orange-600 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center mb-2">
                            <Store className="w-4 h-4 text-blue-600" />
                        </div>
                        <p className="text-xl font-black text-gray-900 leading-none">{units.length}</p>
                        <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">Unidades</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center mb-2">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                        </div>
                        <p className="text-xl font-black text-gray-900 leading-none">{totalZeroed}</p>
                        <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">Itens Zerados</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center mb-2">
                            <Clock className="w-4 h-4 text-amber-600" />
                        </div>
                        <p className="text-xl font-black text-gray-900 leading-none">{outdatedUnits}</p>
                        <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">Desatualizadas</p>
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="flex flex-col gap-3">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar item nas lojas..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-gray-100 rounded-2xl py-3 pl-11 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        <button
                            onClick={() => setFilterOnlyZeroed(!filterOnlyZeroed)}
                            className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                filterOnlyZeroed 
                                ? 'bg-red-500 text-white shadow-lg shadow-red-200' 
                                : 'bg-white text-gray-500 border border-gray-100'
                            }`}
                        >
                            Apenas Zerados
                        </button>
                    </div>
                </div>

                {/* Units List */}
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2].map(i => (
                            <div key={i} className="h-40 bg-white rounded-3xl animate-pulse border border-gray-100" />
                        ))}
                    </div>
                ) : filteredUnits.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-100">
                        <Warehouse className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-gray-900 font-black">Nenhum dado encontrado</h3>
                        <p className="text-sm text-gray-400 mt-1">Tente ajustar os filtros ou aguarde novas contagens.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredUnits.map(unit => (
                            <div key={unit.unit_id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                                {/* Unit Header */}
                                <button
                                    onClick={() => toggleUnit(unit.unit_id)}
                                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-8 rounded-full ${
                                            unit.freshness_status === 'updated' ? 'bg-emerald-500' :
                                            unit.freshness_status === 'attention' ? 'bg-amber-500' : 'bg-red-500'
                                        }`} />
                                        <div className="text-left">
                                            <h3 className="font-black text-gray-900">{unit.unit_name}</h3>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                Última contagem: {format(new Date(unit.last_count_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${
                                            unit.freshness_status === 'updated' ? 'bg-emerald-50 text-emerald-600' :
                                            unit.freshness_status === 'attention' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                                        }`}>
                                            {unit.freshness_status === 'updated' ? 'Atualizada' :
                                             unit.freshness_status === 'attention' ? 'Atenção' : 'Desatualizada'}
                                        </span>
                                        {expandedUnits[unit.unit_id] ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                                    </div>
                                </button>

                                {/* Unit Groups */}
                                {expandedUnits[unit.unit_id] && (
                                    <div className="border-t border-gray-50 p-3 space-y-3">
                                        {unit.groups.map(group => (
                                            <div key={group.group_id} className="bg-gray-50/50 rounded-2xl overflow-hidden">
                                                <button
                                                    onClick={() => toggleGroup(`${unit.unit_id}-${group.group_id}`)}
                                                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100/50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Boxes className="w-4 h-4 text-gray-400" />
                                                        <span className="text-xs font-black text-gray-600 uppercase tracking-wide">
                                                            {group.group_name} · {group.items.length} itens
                                                        </span>
                                                    </div>
                                                    {expandedGroups[`${unit.unit_id}-${group.group_id}`] ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                                </button>

                                                {expandedGroups[`${unit.unit_id}-${group.group_id}`] && (
                                                    <div className="bg-white border-t border-gray-100">
                                                        <div className="divide-y divide-gray-50">
                                                            {group.items.map(item => (
                                                                <div key={item.item_id} className="px-4 py-3 flex items-center justify-between hover:bg-orange-50/30 transition-colors">
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-sm font-bold text-gray-900 truncate">{item.item_name}</p>
                                                                        <p className="text-[10px] text-gray-400 font-medium">
                                                                            Por {item.responsible_name} · {format(new Date(item.counted_at), "HH:mm")}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex items-center gap-4 shrink-0">
                                                                        <div className="text-right">
                                                                            <p className={`text-sm font-black ${item.is_zeroed ? 'text-red-500' : 'text-gray-900'}`}>
                                                                                {item.is_zeroed ? 'ZERADO' : `${item.quantity} ${item.unit}`}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
