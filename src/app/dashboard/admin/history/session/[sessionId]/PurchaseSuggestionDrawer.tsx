'use client'

import { useState, useEffect } from 'react'
import { Loader2, X, Download, AlertTriangle, CheckCircle2, ShoppingCart, MinusCircle, HelpCircle, Edit2, Check } from 'lucide-react'
import { getPurchaseSuggestionAction, PurchaseSuggestionItem } from '@/app/actions/purchaseSuggestionAction'
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

    const handleStartEdit = (item: PurchaseSuggestionItem) => {
        setEditingId(item.count_item_id)
        setEditValue(String(item.suggested_qty))
    }

    const handleSaveEdit = (id: string) => {
        const newVal = Number(editValue)
        if (isNaN(newVal)) return
        setItems(prev => prev.map(item => 
            item.count_item_id === id ? { ...item, suggested_qty: newVal } : item
        ))
        setEditingId(null)
        toast.success('Quantidade ajustada')
    }

    if (!isOpen) return null

    const summary = {
        total: items.length,
        toBuy: items.filter(i => i.status === 'Comprar').length,
        noNeed: items.filter(i => i.status === 'Não precisa comprar').length,
        review: items.filter(i => i.status === 'Sem estoque ideal' || i.status === 'Sem vínculo' || i.status === 'Revisar').length
    }

    return (
        <div className="fixed inset-0 z-[60] flex justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">Sugestão de Compras</h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Baseado na contagem e estoque ideal</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition">
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-4">
                            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Calculando sugestões...</p>
                        </div>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                                    <ShoppingCart className="w-5 h-5 text-indigo-600 mb-2" />
                                    <p className="text-2xl font-black text-indigo-900 leading-none">{summary.toBuy}</p>
                                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mt-1">Comprar</p>
                                </div>
                                <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                                    <CheckCircle2 className="w-5 h-5 text-green-600 mb-2" />
                                    <p className="text-2xl font-black text-green-900 leading-none">{summary.noNeed}</p>
                                    <p className="text-[10px] font-bold text-green-400 uppercase tracking-wider mt-1">Suficiente</p>
                                </div>
                                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 mb-2" />
                                    <p className="text-2xl font-black text-amber-900 leading-none">{summary.review}</p>
                                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mt-1">Revisar</p>
                                </div>
                            </div>

                            {/* Items List */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Listagem de Itens</p>
                                {items.map(item => (
                                    <div key={item.count_item_id} className="bg-white border border-gray-100 rounded-[24px] p-4 shadow-sm space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-0.5">
                                                <h4 className="text-sm font-bold text-gray-900 leading-tight">{item.count_item_name}</h4>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    Ideal: {item.ideal_stock} {item.unit} · Contado: {item.counted_qty} {item.unit}
                                                </p>
                                            </div>
                                            <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider ${
                                                item.status === 'Comprar' ? 'bg-indigo-100 text-indigo-700' :
                                                item.status === 'Não precisa comprar' ? 'bg-green-100 text-green-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                                {item.status}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                                            <div className="flex items-center space-x-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                                                <span>Sugestão:</span>
                                                {editingId === item.count_item_id ? (
                                                    <div className="flex items-center space-x-1">
                                                        <input 
                                                            type="number"
                                                            value={editValue}
                                                            onChange={e => setEditValue(e.target.value)}
                                                            className="w-16 px-2 py-1 border border-indigo-300 rounded-lg outline-none text-indigo-700"
                                                            autoFocus
                                                        />
                                                        <button onClick={() => handleSaveEdit(item.count_item_id)} className="p-1 bg-indigo-600 text-white rounded-lg">
                                                            <Check className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center space-x-2">
                                                        <span className={`text-base font-black ${item.suggested_qty > 0 ? 'text-indigo-600' : 'text-gray-400'}`}>
                                                            {item.suggested_qty} {item.unit}
                                                        </span>
                                                        <button onClick={() => handleStartEdit(item)} className="p-1 text-gray-300 hover:text-indigo-400 transition">
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            {item.status_detail && (
                                                <p className="text-[9px] text-amber-600 font-bold italic">{item.status_detail}</p>
                                            )}
                                        </div>
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
