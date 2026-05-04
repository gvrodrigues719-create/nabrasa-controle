'use client'

import { useState, useEffect } from 'react'
import { Loader2, X, Download, AlertTriangle, CheckCircle2, ShoppingCart, MinusCircle, HelpCircle, Edit2, Check, Search, Link2, RefreshCw } from 'lucide-react'
import { getPurchaseSuggestionAction, PurchaseSuggestionItem, searchPurchaseCatalogAction, saveItemMappingAction } from '@/app/actions/purchaseSuggestionAction'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'

interface Props {
    sessionId: string
    isOpen: boolean
    onClose: () => void
}

export default function PurchaseSuggestionDrawer({ sessionId, isOpen, onClose }: Props) {
    const [loading, setLoading] = useState(false)
    const [items, setItems] = useState<PurchaseSuggestionItem[]>([])
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editValue, setEditValue] = useState<string>('')
    const [mappingId, setMappingId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [searching, setSearching] = useState(false)

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
        const rows = items.map(item => ({
            'Item Contado': item.count_item_name,
            'Quantidade Contada': item.counted_qty,
            'Item Compra': item.purchase_item_name || '—',
            'Estoque Ideal': item.ideal_stock,
            'Sugestão de Compra': item.suggested_qty,
            'Unidade': item.unit || 'un',
            'Status': item.status,
            'Observação': item.status_detail || ''
        }))

        const ws = XLSX.utils.json_to_sheet(rows)
        ws['!cols'] = [25, 18, 25, 15, 18, 10, 20, 30].map(w => ({ wch: w }))
        XLSX.utils.book_append_sheet(wb, ws, 'Sugestão de Compras')
        XLSX.writeFile(wb, `sugestao_compras_sessao_${sessionId.substring(0, 8)}.xlsx`)
        toast.success('Excel exportado com sucesso!')
    }

    const handleSearch = async (val: string) => {
        setSearchQuery(val)
        if (val.length < 2) {
            setSearchResults([])
            return
        }
        setSearching(true)
        const res = await searchPurchaseCatalogAction(val)
        if (res.success) setSearchResults(res.data || [])
        setSearching(false)
    }

    const handleSaveMapping = async (countItemId: string, purchaseItemId: string) => {
        const res = await saveItemMappingAction(countItemId, purchaseItemId)
        if (res.success) {
            toast.success('Vínculo salvo com sucesso!')
            setMappingId(null)
            setSearchQuery('')
            setSearchResults([])
            loadSuggestions() // Recarrega tudo para recalcular com o novo vínculo
        } else {
            toast.error('Erro ao salvar vínculo')
        }
    }

    if (!isOpen) return null

    const summary = {
        total: items.length,
        toBuy: items.filter(i => i.status === 'Comprar').length,
        noNeed: items.filter(i => i.status === 'Não precisa comprar').length,
        noLink: items.filter(i => i.status === 'Sem vínculo').length,
        noIdeal: items.filter(i => i.status === 'Sem estoque ideal').length,
        review: items.filter(i => i.status === 'Revisar').length
    }

    return (
        <div className="fixed inset-0 z-[60] flex justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">Sugestão de Compras</h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Painel Administrativo de Suprimentos</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={loadSuggestions} className="p-2 hover:bg-gray-200 rounded-full transition text-indigo-600">
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition">
                            <X className="w-6 h-6 text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {loading && items.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-4">
                            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Analisando contagem...</p>
                        </div>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-5 gap-2">
                                <div className="bg-indigo-50 p-3 rounded-2xl border border-indigo-100 text-center">
                                    <p className="text-xl font-black text-indigo-900 leading-none">{summary.toBuy}</p>
                                    <p className="text-[8px] font-bold text-indigo-400 uppercase tracking-wider mt-1">Comprar</p>
                                </div>
                                <div className="bg-green-50 p-3 rounded-2xl border border-green-100 text-center">
                                    <p className="text-xl font-black text-green-900 leading-none">{summary.noNeed}</p>
                                    <p className="text-[8px] font-bold text-green-400 uppercase tracking-wider mt-1">OK</p>
                                </div>
                                <div className="bg-red-50 p-3 rounded-2xl border border-red-100 text-center">
                                    <p className="text-xl font-black text-red-900 leading-none">{summary.noLink}</p>
                                    <p className="text-[8px] font-bold text-red-400 uppercase tracking-wider mt-1">S/ Vínculo</p>
                                </div>
                                <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100 text-center">
                                    <p className="text-xl font-black text-amber-900 leading-none">{summary.noIdeal}</p>
                                    <p className="text-[8px] font-bold text-amber-400 uppercase tracking-wider mt-1">S/ Ideal</p>
                                </div>
                                <div className="bg-orange-50 p-3 rounded-2xl border border-orange-100 text-center">
                                    <p className="text-xl font-black text-orange-900 leading-none">{summary.review}</p>
                                    <p className="text-[8px] font-bold text-orange-400 uppercase tracking-wider mt-1">Revisar</p>
                                </div>
                            </div>

                            {/* Items List */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Lista de Itens da Contagem</p>
                                {items.map(item => (
                                    <div key={item.count_item_id} className={`bg-white border rounded-[24px] p-4 shadow-sm space-y-3 transition-all ${
                                        mappingId === item.count_item_id ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-gray-100'
                                    }`}>
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-0.5 max-w-[70%]">
                                                <h4 className="text-sm font-bold text-gray-900 leading-tight">{item.count_item_name}</h4>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                        Contado: {item.counted_qty} {item.unit}
                                                    </p>
                                                    {item.purchase_item_name && (
                                                        <span className="text-[10px] font-medium text-indigo-400 truncate italic">
                                                            → {item.purchase_item_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-wider ${
                                                    item.status === 'Comprar' ? 'bg-indigo-100 text-indigo-700' :
                                                    item.status === 'Não precisa comprar' ? 'bg-green-100 text-green-700' :
                                                    item.status === 'Sem vínculo' ? 'bg-red-100 text-red-700' :
                                                    'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {item.status}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Mapping UI */}
                                        {mappingId === item.count_item_id ? (
                                            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 space-y-3 animate-in fade-in zoom-in duration-200">
                                                <div className="relative">
                                                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                                                    <input 
                                                        type="text"
                                                        value={searchQuery}
                                                        onChange={e => handleSearch(e.target.value)}
                                                        placeholder="Buscar item no catálogo de compras..."
                                                        className="w-full pl-9 pr-4 py-2 bg-white border border-indigo-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                                        autoFocus
                                                    />
                                                </div>
                                                
                                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                                    {searching ? (
                                                        <div className="py-4 text-center">
                                                            <Loader2 className="w-4 h-4 text-indigo-600 animate-spin mx-auto" />
                                                        </div>
                                                    ) : searchResults.length > 0 ? (
                                                        searchResults.map(res => (
                                                            <button 
                                                                key={res.id}
                                                                onClick={() => handleSaveMapping(item.count_item_id, res.id)}
                                                                className="w-full text-left p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all border border-transparent hover:border-indigo-100 flex justify-between items-center group"
                                                            >
                                                                <span className="text-[11px] font-bold text-gray-700 group-hover:text-indigo-600">{res.name}</span>
                                                                <span className="text-[9px] text-gray-400 uppercase">{res.unit}</span>
                                                            </button>
                                                        ))
                                                    ) : searchQuery.length >= 2 ? (
                                                        <p className="text-[10px] text-center py-2 text-gray-400 font-bold uppercase">Nenhum item encontrado</p>
                                                    ) : null}
                                                </div>

                                                <button 
                                                    onClick={() => setMappingId(null)}
                                                    className="w-full py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center space-x-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                                                        <span>Sugestão:</span>
                                                        <span className={`text-base font-black ${item.suggested_qty > 0 ? 'text-indigo-600' : 'text-gray-400'}`}>
                                                            {item.suggested_qty} {item.unit}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center space-x-1 text-[10px] text-gray-400 font-bold uppercase">
                                                        <span>Ideal:</span>
                                                        <span>{item.ideal_stock}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {(item.status === 'Sem vínculo' || item.status === 'Revisar') && (
                                                        <button 
                                                            onClick={() => setMappingId(item.count_item_id)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 transition active:scale-95"
                                                        >
                                                            <Link2 className="w-3 h-3" />
                                                            Vincular
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {item.status_detail && mappingId !== item.count_item_id && (
                                            <div className="flex items-center gap-1 bg-amber-50 p-2 rounded-lg">
                                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                                                <p className="text-[9px] text-amber-600 font-bold italic">{item.status_detail}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                    <button 
                        onClick={handleExport}
                        disabled={loading || items.length === 0}
                        className="w-full py-4 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-green-100 hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50"
                    >
                        <Download className="w-5 h-5" />
                        Exportar Excel para Compras
                    </button>
                </div>
            </div>
        </div>
    )
}
