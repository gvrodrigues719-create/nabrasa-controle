'use client'

import { useState, useEffect, useMemo } from 'react'
import { Loader2, X, Download, AlertTriangle, CheckCircle2, ShoppingCart, MinusCircle, HelpCircle, Edit2, Check, Search, Link2, RefreshCw, Info, Filter, Package } from 'lucide-react'
import { getPurchaseSuggestionAction, PurchaseSuggestionItem, searchPurchaseCatalogAction, saveItemMappingAction } from '@/app/actions/purchaseSuggestionAction'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'

interface Props {
    sessionId: string
    isOpen: boolean
    onClose: () => void
}

type TabType = 'Comprar' | 'Todos' | 'Suficiente' | 'Revisar' | 'Sem vínculo' | 'Sem ideal'

export default function PurchaseSuggestionDrawer({ sessionId, isOpen, onClose }: Props) {
    const [loading, setLoading] = useState(false)
    const [items, setItems] = useState<PurchaseSuggestionItem[]>([])
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editValue, setEditValue] = useState<string>('')
    const [mappingId, setMappingId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [internalSearch, setInternalSearch] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [searching, setSearching] = useState(false)
    const [diagnostic, setDiagnostic] = useState<any>(null)
    const [activeTab, setActiveTab] = useState<TabType>('Comprar')
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    useEffect(() => {
        if (isOpen) {
            loadSuggestions()
        }
    }, [isOpen, sessionId])

    const loadSuggestions = async () => {
        setLoading(true)
        try {
            const res = await getPurchaseSuggestionAction(sessionId)
            if (res.success && res.data) {
                setItems(res.data)
                setDiagnostic(res.diagnostic)
                
                // Seleção padrão: Apenas itens "Comprar" com sugestão > 0
                const initialSelected = new Set<string>(
                    res.data.filter(i => i.status === 'Comprar' && i.suggested_qty > 0).map(i => i.count_item_id)
                )
                setSelectedIds(initialSelected)
            } else {
                toast.error(res.error || 'Erro ao carregar sugestões')
            }
        } catch (e) {
            toast.error('Falha na conexão com o servidor')
        } finally {
            setLoading(false)
        }
    }

    const handleExport = () => {
        if (items.length === 0) return

        const wb = XLSX.utils.book_new()
        
        // Aba 1: Lista de Compra (Somente selecionados)
        const selectedItems = items.filter(i => selectedIds.has(i.count_item_id))
        const buyRows = selectedItems.map(item => ({
            'Item de Compra': item.purchase_item_name || '—',
            'Sugestão': item.suggested_qty,
            'Unidade': item.unit || 'un',
            'Motivo': item.motivo || '',
            'Item Contado': item.count_item_name
        }))
        const wsBuy = XLSX.utils.json_to_sheet(buyRows)
        wsBuy['!cols'] = [30, 15, 10, 35, 25].map(w => ({ wch: w }))
        XLSX.utils.book_append_sheet(wb, wsBuy, 'Lista de Compra')

        // Aba 2: Análise Completa
        const allRows = items.map(item => ({
            'Item Contado': item.count_item_name,
            'Item Compra': item.purchase_item_name || '—',
            'Qtd Contada': item.counted_qty,
            'Mínimo': item.min_stock,
            'Alvo': item.max_stock,
            'Sugestão': item.suggested_qty,
            'Unid.': item.unit || 'un',
            'Status': item.status,
            'Motivo': item.motivo || '',
            'Selecionado': selectedIds.has(item.count_item_id) ? 'Sim' : 'Não'
        }))
        const wsAll = XLSX.utils.json_to_sheet(allRows)
        wsAll['!cols'] = [25, 25, 12, 10, 10, 12, 8, 15, 30, 12].map(w => ({ wch: w }))
        XLSX.utils.book_append_sheet(wb, wsAll, 'Análise Completa')

        XLSX.writeFile(wb, `pedido_compras_sessao_${sessionId.substring(0, 8)}.xlsx`)
        toast.success('Lista de compras exportada!')
    }

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const matchesTab = 
                activeTab === 'Todos' || 
                (activeTab === 'Comprar' && item.status === 'Comprar') ||
                (activeTab === 'Suficiente' && item.status === 'Não precisa comprar') ||
                (activeTab === 'Revisar' && item.status === 'Revisar') ||
                (activeTab === 'Sem vínculo' && item.status === 'Sem vínculo') ||
                (activeTab === 'Sem ideal' && item.status === 'Sem estoque ideal')

            if (!matchesTab) return false
            if (!internalSearch) return true
            
            const search = internalSearch.toLowerCase()
            return (
                item.count_item_name.toLowerCase().includes(search) ||
                item.purchase_item_name?.toLowerCase().includes(search) ||
                item.status.toLowerCase().includes(search)
            )
        })
    }, [items, activeTab, internalSearch])

    const summary = {
        total: items.length,
        toBuy: items.filter(i => i.status === 'Comprar').length,
        noNeed: items.filter(i => i.status === 'Não precisa comprar').length,
        noLink: items.filter(i => i.status === 'Sem vínculo').length,
        noIdeal: items.filter(i => i.status === 'Sem estoque ideal').length,
        review: items.filter(i => i.status === 'Revisar').length,
        selectedToBuy: items.filter(i => selectedIds.has(i.count_item_id)).length
    }

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const handleSaveMapping = async (countItemId: string, purchaseItemId: string) => {
        const res = await saveItemMappingAction(countItemId, purchaseItemId)
        if (res.success) {
            toast.success('Vínculo salvo!')
            setMappingId(null)
            loadSuggestions() 
        } else {
            toast.error('Erro ao salvar vínculo')
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[60] flex justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">Sugestão de Compras</h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Decisão rápida baseada na contagem</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={loadSuggestions} title="Recarregar" className="p-2 hover:bg-gray-200 rounded-full transition text-indigo-600">
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition">
                            <X className="w-6 h-6 text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="p-6 bg-white border-b border-gray-50">
                    <div className="grid grid-cols-5 gap-2">
                        <button onClick={() => setActiveTab('Comprar')} className={`p-3 rounded-2xl border transition-all ${activeTab === 'Comprar' ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-gray-50 border-gray-100'}`}>
                            <p className={`text-xl font-black leading-none ${activeTab === 'Comprar' ? 'text-white' : 'text-gray-900'}`}>{summary.toBuy}</p>
                            <p className={`text-[8px] font-bold uppercase tracking-wider mt-1 ${activeTab === 'Comprar' ? 'text-indigo-100' : 'text-gray-400'}`}>Comprar</p>
                        </button>
                        <button onClick={() => setActiveTab('Suficiente')} className={`p-3 rounded-2xl border transition-all ${activeTab === 'Suficiente' ? 'bg-green-600 border-green-600 shadow-lg shadow-green-100' : 'bg-gray-50 border-gray-100'}`}>
                            <p className={`text-xl font-black leading-none ${activeTab === 'Suficiente' ? 'text-white' : 'text-gray-900'}`}>{summary.noNeed}</p>
                            <p className={`text-[8px] font-bold uppercase tracking-wider mt-1 ${activeTab === 'Suficiente' ? 'text-green-100' : 'text-gray-400'}`}>Suficiente</p>
                        </button>
                        <button onClick={() => setActiveTab('Sem vínculo')} className={`p-3 rounded-2xl border transition-all ${activeTab === 'Sem vínculo' ? 'bg-red-600 border-red-600 shadow-lg shadow-red-100' : 'bg-gray-50 border-gray-100'}`}>
                            <p className={`text-xl font-black leading-none ${activeTab === 'Sem vínculo' ? 'text-white' : 'text-gray-900'}`}>{summary.noLink}</p>
                            <p className={`text-[8px] font-bold uppercase tracking-wider mt-1 ${activeTab === 'Sem vínculo' ? 'text-red-100' : 'text-gray-400'}`}>Vínculos</p>
                        </button>
                        <button onClick={() => setActiveTab('Revisar')} className={`p-3 rounded-2xl border transition-all ${activeTab === 'Revisar' ? 'bg-orange-600 border-orange-600 shadow-lg shadow-orange-100' : 'bg-gray-50 border-gray-100'}`}>
                            <p className={`text-xl font-black leading-none ${activeTab === 'Revisar' ? 'text-white' : 'text-gray-900'}`}>{summary.review}</p>
                            <p className={`text-[8px] font-bold uppercase tracking-wider mt-1 ${activeTab === 'Revisar' ? 'text-orange-100' : 'text-gray-400'}`}>Revisar</p>
                        </button>
                        <button onClick={() => setActiveTab('Todos')} className={`p-3 rounded-2xl border transition-all ${activeTab === 'Todos' ? 'bg-gray-900 border-gray-900 shadow-lg shadow-gray-200' : 'bg-gray-50 border-gray-100'}`}>
                            <p className={`text-xl font-black leading-none ${activeTab === 'Todos' ? 'text-white' : 'text-gray-900'}`}>{summary.total}</p>
                            <p className={`text-[8px] font-bold uppercase tracking-wider mt-1 ${activeTab === 'Todos' ? 'text-gray-400' : 'text-gray-400'}`}>Todos</p>
                        </button>
                    </div>

                    <p className="mt-4 text-[11px] font-bold text-gray-500 italic">
                        {summary.toBuy > 0 
                            ? `${summary.toBuy} itens abaixo do mínimo. Revise e exporte a lista.` 
                            : 'Nenhum item precisa ser comprado agora.'}
                        {summary.review > 0 && ' • Existem itens que precisam de revisão.'}
                    </p>
                </div>

                {/* Filters & Search */}
                <div className="px-6 py-4 bg-gray-50/50 flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        <input 
                            type="text"
                            value={internalSearch}
                            onChange={e => setInternalSearch(e.target.value)}
                            placeholder="Buscar item na sugestão..."
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                        />
                    </div>
                    {/* Botão de Tabs (Oculto em Mobile se preferir) */}
                    <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1">
                        {['Comprar', 'Todos'].map((t) => (
                            <button 
                                key={t} 
                                onClick={() => setActiveTab(t as any)}
                                className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === t ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loading && items.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-4">
                            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Processando decisão...</p>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-40">
                            <Package className="w-12 h-12 text-gray-300" />
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nenhum item nesta categoria</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredItems.map(item => (
                                <div 
                                    key={item.count_item_id} 
                                    className={`relative bg-white border rounded-2xl p-3 shadow-sm transition-all hover:shadow-md ${
                                        selectedIds.has(item.count_item_id) ? 'border-indigo-200 ring-2 ring-indigo-50' : 'border-gray-100'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Selection Checkbox */}
                                        <button 
                                            onClick={() => toggleSelection(item.count_item_id)}
                                            className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                                selectedIds.has(item.count_item_id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 hover:border-indigo-400'
                                            }`}
                                        >
                                            {selectedIds.has(item.count_item_id) && <Check className="w-3.5 h-3.5" />}
                                        </button>

                                        <div className="flex-1 space-y-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="text-sm font-bold text-gray-900 leading-tight">{item.count_item_name}</h4>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                        Contado: <span className="text-gray-700">{item.counted_qty} {item.unit}</span>
                                                        {item.purchase_item_name && <span className="ml-1 italic text-indigo-400">→ {item.purchase_item_name}</span>}
                                                    </p>
                                                </div>
                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                                    item.status === 'Comprar' ? 'bg-indigo-600 text-white' :
                                                    item.status === 'Não precisa comprar' ? 'bg-green-100 text-green-700' :
                                                    'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {item.status === 'Não precisa comprar' ? 'Suficiente' : item.status}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between text-[10px] bg-gray-50/80 p-2 rounded-lg border border-gray-100">
                                                <div className="flex gap-4">
                                                    <div><span className="text-gray-400 font-bold uppercase mr-1">Mín:</span><span className="font-black">{item.min_stock}</span></div>
                                                    <div><span className="text-gray-400 font-bold uppercase mr-1">Alvo:</span><span className="font-black">{item.max_stock}</span></div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-indigo-400 font-black uppercase">Sugestão:</span>
                                                    {editingId === item.count_item_id ? (
                                                        <div className="flex items-center gap-1">
                                                            <input 
                                                                type="number" 
                                                                value={editValue} 
                                                                onChange={e => setEditValue(e.target.value)}
                                                                className="w-12 h-6 border border-indigo-300 rounded px-1 text-center font-black text-indigo-600 outline-none"
                                                                autoFocus
                                                            />
                                                            <button onClick={() => {
                                                                const val = Number(editValue)
                                                                setItems(prev => prev.map(i => i.count_item_id === item.count_item_id ? { ...i, suggested_qty: val } : i))
                                                                setEditingId(null)
                                                            }} className="p-1 bg-indigo-600 text-white rounded"><Check className="w-3 h-3" /></button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1 group">
                                                            <span className="text-sm font-black text-indigo-600">{item.suggested_qty} {item.unit}</span>
                                                            <button onClick={() => { setEditingId(item.count_item_id); setEditValue(String(item.suggested_qty)) }} className="opacity-0 group-hover:opacity-100 transition p-1 text-gray-300 hover:text-indigo-500">
                                                                <Edit2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {item.motivo && (
                                                <p className="text-[9px] font-bold text-gray-400 flex items-center gap-1">
                                                    <Info className="w-3 h-3 text-gray-300" />
                                                    {item.motivo}
                                                </p>
                                            )}

                                            {/* Mapping Action (Compact) */}
                                            {item.status === 'Sem vínculo' && (
                                                <button onClick={() => setMappingId(item.count_item_id)} className="w-full py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-100 transition">
                                                    Vincular Item de Compra
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer (Fixed) */}
                <div className="p-6 border-t border-gray-100 bg-white shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]">
                    <div className="flex items-center justify-between mb-4">
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Itens para Compra</p>
                            <p className="text-sm font-black text-gray-900">{summary.selectedToBuy} selecionados</p>
                        </div>
                        {summary.review > 0 && (
                            <div className="flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100">
                                <AlertTriangle className="w-3 h-3 text-orange-500" />
                                <span className="text-[10px] font-black text-orange-700 uppercase tracking-widest">{summary.review} precisam de revisão</span>
                            </div>
                        )}
                    </div>
                    
                    <button 
                        onClick={handleExport}
                        disabled={loading || items.length === 0}
                        className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-gray-200"
                    >
                        <Download className="w-5 h-5" />
                        Exportar lista de compras
                    </button>
                </div>
            </div>
        </div>
    )
}
