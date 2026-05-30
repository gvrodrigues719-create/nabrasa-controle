'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
    Loader2, X, Download, AlertTriangle, CheckCircle2, ShoppingCart, 
    Search, Info, Package, ListChecks, History, ArrowRight, Edit2, Check,
    AlertCircle
} from 'lucide-react'
import { getConsolidatedPurchaseSuggestionAction, ConsolidatedSuggestionItem } from '@/app/actions/consolidatedPurchaseAction'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'

interface Props {
    sessionIds: string[]
    isOpen: boolean
    onClose: () => void
}

type TabType = 'Comprar' | 'Todos' | 'Pendências'

export default function ConsolidatedPurchaseSuggestionDrawer({ sessionIds, isOpen, onClose }: Props) {
    const [loading, setLoading] = useState(false)
    const [items, setItems] = useState<ConsolidatedSuggestionItem[]>([])
    const [diagnostic, setDiagnostic] = useState<any>(null)
    const [activeTab, setActiveTab] = useState<TabType>('Comprar')
    const [internalSearch, setInternalSearch] = useState('')
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editValue, setEditValue] = useState<string>('')

    useEffect(() => {
        if (isOpen && sessionIds.length > 0) {
            loadConsolidated()
        }
    }, [isOpen, sessionIds])

    const loadConsolidated = async () => {
        setLoading(true)
        try {
            const res = await getConsolidatedPurchaseSuggestionAction(sessionIds)
            if (res.success && res.data) {
                setItems(res.data)
                setDiagnostic(res.diagnostic)
                
                // Se não houver nada para comprar, mas houver pendências, muda de aba
                const hasToBuy = res.data.some(i => i.status === 'Comprar')
                if (!hasToBuy) {
                    const hasPending = res.data.some(i => ['Sem vínculo', 'Sem estoque ideal', 'Revisar'].includes(i.status))
                    if (hasPending) setActiveTab('Pendências')
                    else setActiveTab('Todos')
                }

                // Seleção padrão: Apenas itens "Comprar"
                const initialSelected = new Set<string>(
                    res.data.filter(i => i.status === 'Comprar').map(i => i.purchase_item_id)
                )
                setSelectedIds(initialSelected)
            } else {
                toast.error(res.error || 'Erro ao consolidar sugestões')
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
        
        // Aba 1: Lista de Compra Consolidada
        const selectedItems = items.filter(i => selectedIds.has(i.purchase_item_id))
        const buyRows = selectedItems.map(item => ({
            'Item de Compra': item.purchase_item_name || '—',
            'Sugestão': item.suggested_qty,
            'Unidade': item.unit || 'un',
            'Estoque Consolidado': item.consolidated_counted_qty,
            'Mínimo': item.min_stock,
            'Alvo': item.max_stock,
            'Origens': item.origins.join(', '),
            'Motivo': item.motivo || ''
        }))
        const wsBuy = XLSX.utils.json_to_sheet(buyRows)
        wsBuy['!cols'] = [30, 12, 10, 18, 10, 10, 35, 35].map(w => ({ wch: w }))
        XLSX.utils.book_append_sheet(wb, wsBuy, 'Lista de Compra')

        // Aba 2: Análise Completa
        const allRows = items.map(item => ({
            'Item de Compra': item.purchase_item_name || '—',
            'Estoque Consolidado': item.consolidated_counted_qty,
            'Sugestão': item.suggested_qty,
            'Status': item.status,
            'Mínimo': item.min_stock,
            'Alvo': item.max_stock,
            'Origens': item.origins.join(', '),
            'Corrigido Gerente?': item.is_corrected ? 'Sim' : 'Não',
            'Motivo': item.motivo || ''
        }))
        const wsAll = XLSX.utils.json_to_sheet(allRows)
        wsAll['!cols'] = [30, 18, 12, 15, 10, 10, 40, 15, 35].map(w => ({ wch: w }))
        XLSX.utils.book_append_sheet(wb, wsAll, 'Análise Completa')

        // Aba 3: Sessões Utilizadas
        const sessionRows = sessionIds.map(id => ({ 'Session ID': id }))
        const wsSessions = XLSX.utils.json_to_sheet(sessionRows)
        XLSX.utils.book_append_sheet(wb, wsSessions, 'Sessões Consolidadas')

        XLSX.writeFile(wb, `sugestao_consolidada_${new Date().getTime()}.xlsx`)
        toast.success('Excel consolidado exportado!')
    }

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const matchesTab = 
                activeTab === 'Todos' || 
                (activeTab === 'Comprar' && item.status === 'Comprar') ||
                (activeTab === 'Pendências' && (item.status === 'Sem vínculo' || item.status === 'Sem estoque ideal' || item.status === 'Revisar'))

            if (!matchesTab) return false
            if (!internalSearch) return true
            
            const search = internalSearch.toLowerCase()
            return (
                item.purchase_item_name?.toLowerCase().includes(search) ||
                item.status.toLowerCase().includes(search) ||
                item.origins.some(o => o.toLowerCase().includes(search))
            )
        })
    }, [items, activeTab, internalSearch])

    const summary = {
        total: items.length,
        toBuy: items.filter(i => i.status === 'Comprar').length,
        pending: items.filter(i => ['Sem vínculo', 'Sem estoque ideal', 'Revisar'].includes(i.status)).length,
        selectedToBuy: items.filter(i => selectedIds.has(i.purchase_item_id)).length
    }

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[60] flex justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Sugestão Consolidada</h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Baseada em {sessionIds.length} contagens selecionadas</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition">
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                {/* Status Tabs */}
                <div className="px-6 pt-6 pb-2 flex gap-4 border-b border-gray-50">
                    <button onClick={() => setActiveTab('Comprar')} className={`pb-4 px-2 text-[11px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'Comprar' ? 'text-indigo-600' : 'text-gray-400'}`}>
                        Comprar ({summary.toBuy})
                        {activeTab === 'Comprar' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full" />}
                    </button>
                    <button onClick={() => setActiveTab('Pendências')} className={`pb-4 px-2 text-[11px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'Pendências' ? 'text-amber-600' : 'text-gray-400'}`}>
                        Pendências ({summary.pending})
                        {activeTab === 'Pendências' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-600 rounded-t-full" />}
                    </button>
                    <button onClick={() => setActiveTab('Todos')} className={`pb-4 px-2 text-[11px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'Todos' ? 'text-gray-900' : 'text-gray-400'}`}>
                        Todos ({summary.total})
                        {activeTab === 'Todos' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900 rounded-t-full" />}
                    </button>
                </div>

                {/* Search */}
                <div className="px-6 py-4 bg-gray-50/50">
                    <div className="relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        <input 
                            type="text"
                            value={internalSearch}
                            onChange={e => setInternalSearch(e.target.value)}
                            placeholder="Buscar item ou origem..."
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm font-medium"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-4">
                            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest text-center">
                                Consolidando estoques...<br/>
                                <span className="text-[10px] lowercase font-normal">Isso pode levar alguns segundos dependendo do volume</span>
                            </p>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                                <Package className="w-10 h-10 text-gray-200" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Nenhum item nesta aba</p>
                                <p className="text-xs text-gray-400 font-medium mt-1">
                                    {activeTab === 'Comprar' && summary.pending > 0 
                                        ? `Existem ${summary.pending} itens com pendências de vínculo ou estoque alvo que não puderam ser processados.`
                                        : 'Não há itens para exibir com os filtros atuais.'}
                                </p>
                            </div>
                            {activeTab === 'Comprar' && summary.pending > 0 && (
                                <button 
                                    onClick={() => setActiveTab('Pendências')}
                                    className="px-6 py-3 bg-amber-50 text-amber-700 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-amber-100 hover:bg-amber-100 transition"
                                >
                                    Ver Pendências de Vínculo
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredItems.map(item => (
                                <div 
                                    key={item.purchase_item_id} 
                                    className={`relative bg-white border rounded-[32px] p-5 transition-all ${
                                        selectedIds.has(item.purchase_item_id) ? 'border-indigo-100 bg-indigo-50/10' : 'border-gray-100'
                                    }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <button 
                                            onClick={() => toggleSelection(item.purchase_item_id)}
                                            className={`mt-1 w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                                                selectedIds.has(item.purchase_item_id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-gray-50 border-gray-200 text-transparent'
                                            }`}
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>

                                        <div className="flex-1 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1">
                                                    <h4 className="text-base font-black text-gray-900 tracking-tight">{item.purchase_item_name}</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {item.origins.map((origin, idx) => (
                                                            <span key={idx} className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-lg text-[8px] font-black uppercase tracking-widest">
                                                                <History className="w-2.5 h-2.5" />
                                                                {origin}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <span className={`text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-wider ${
                                                    item.status === 'Comprar' ? 'bg-indigo-600 text-white' :
                                                    item.status === 'Suficiente' ? 'bg-green-100 text-green-700' :
                                                    'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {item.status}
                                                </span>
                                            </div>

                                            {/* Consolidated Info Grid */}
                                            <div className="grid grid-cols-3 gap-3 bg-white border border-gray-50 rounded-2xl p-4 shadow-sm">
                                                <div className="space-y-0.5">
                                                    <p className="text-[7px] font-black text-gray-400 uppercase">Estoque Consolidado</p>
                                                    <p className="text-sm font-black text-gray-900">
                                                        {item.consolidated_counted_qty} <span className="text-[10px] text-gray-400">{item.unit}</span>
                                                    </p>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-[7px] font-black text-gray-400 uppercase">Min/Max</p>
                                                    <p className="text-sm font-bold text-gray-800">{item.min_stock}/{item.max_stock}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[7px] font-black text-indigo-400 uppercase mb-1">Sugestão</p>
                                                    <div className="flex items-center gap-2 justify-end">
                                                        {editingId === item.purchase_item_id ? (
                                                            <div className="flex items-center gap-1">
                                                                <input 
                                                                    type="number" 
                                                                    value={editValue} 
                                                                    onChange={e => setEditValue(e.target.value)}
                                                                    className="w-14 h-7 border border-indigo-300 rounded-lg text-center font-black text-indigo-600 outline-none"
                                                                    autoFocus
                                                                />
                                                                <button onClick={() => {
                                                                    const val = Number(editValue)
                                                                    setItems(prev => prev.map(i => i.purchase_item_id === item.purchase_item_id ? { ...i, suggested_qty: val } : i))
                                                                    setEditingId(null)
                                                                }} className="p-1.5 bg-indigo-600 text-white rounded-lg"><Check className="w-3.5 h-3.5" /></button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => { setEditingId(item.purchase_item_id); setEditValue(String(item.suggested_qty)) }}>
                                                                <span className={`text-lg font-black ${item.suggested_qty > 0 ? 'text-indigo-600' : 'text-gray-300'}`}>
                                                                    {item.suggested_qty} {item.unit}
                                                                </span>
                                                                <Edit2 className="w-3.5 h-3.5 text-gray-200 group-hover:text-indigo-400 transition" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Motivo e Auditoria */}
                                            <div className="flex items-center justify-between px-1">
                                                <div className="flex items-center gap-2">
                                                    <Info className="w-3.5 h-3.5 text-indigo-400" />
                                                    <p className="text-[10px] font-bold text-gray-600">
                                                        {item.motivo}
                                                    </p>
                                                </div>
                                                {item.is_corrected && (
                                                    <span className="text-[8px] font-black text-indigo-500 uppercase flex items-center gap-1">
                                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                                        Validado pelo Gerente
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-white shadow-[0_-15px_40px_-20px_rgba(0,0,0,0.15)]">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <div className="space-y-0.5">
                            <p className="text-[11px] font-black text-gray-900 uppercase tracking-tight">
                                {summary.selectedToBuy} itens na lista consolidada
                            </p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Baseada em {sessionIds.length} sessões</p>
                        </div>
                        {summary.pending > 0 && (
                            <div className="flex items-center gap-2 bg-amber-50 px-3 py-2 rounded-2xl border border-amber-100">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">{summary.pending} PENDÊNCIAS</span>
                            </div>
                        )}
                    </div>
                    
                    <button 
                        onClick={handleExport}
                        disabled={loading || items.length === 0}
                        className="w-full py-5 bg-gray-900 text-white rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black active:scale-[0.97] transition-all disabled:opacity-50 shadow-2xl shadow-gray-200"
                    >
                        <Download className="w-6 h-6" />
                        Exportar Lista Consolidada
                    </button>
                </div>
            </div>
        </div>
    )
}
