'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Plus, Trash2, ShoppingCart, DollarSign, Package, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'
import { addStockEntry, getStockEntries, deleteStockEntry } from '@/app/actions/stockActions'

function formatMoney(val: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

export default function PurchasesPage({ params }: { params: Promise<{ executionId: string }> }) {
    const router = useRouter()
    const { executionId } = React.use(params)

    const [items, setItems] = useState<any[]>([])
    const [purchases, setPurchases] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Form state
    const [selectedItemId, setSelectedItemId] = useState('')
    const [quantity, setQuantity] = useState('')
    const [price, setPrice] = useState('')
    const [notes, setNotes] = useState('')
    const [updateAvgCost, setUpdateAvgCost] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)

    useEffect(() => {
        loadBaseData()
    }, [executionId])

    const loadBaseData = async () => {
        try {
            // Buscamos a base de itens abertos (desconsiderando contagem da rotina, pois uma compra pode ter ocorrido mesmo num item que não estava no roteiro)
            const { data: allItems, error: itemsErr } = await supabase.from('items').select('*').order('name')
            if (itemsErr) throw itemsErr
            setItems(allItems || [])

            await loadPurchases()
        } catch (e: any) {
            toast.error("Erro ao carregar dados.")
        } finally {
            setLoading(false)
        }
    }

    const loadPurchases = async () => {
        try {
            const res = await getStockEntries(executionId)
            if (res.success && res.data) {
                setPurchases(res.data)
            }
        } catch (e: any) {
            toast.error(e.message)
        }
    }

    const selectedItem = items.find(i => i.id === selectedItemId)

    const getDynamicLabels = () => {
        if (!selectedItem) return { qty: 'Quantidade', price: 'Custo Total da Compra' }
        
        switch (selectedItem.cost_mode) {
            case 'conversion':
                return { 
                    qty: `Qtd comprada em ${selectedItem.purchase_unit || 'Volume Fechado'} (Fardo/Caixa)`, 
                    price: `Valor Faturado da Nota (Total)`
                }
            case 'direct':
                return { 
                    qty: `Qtd solta / fracionada comprada (${selectedItem.unit})`, 
                    price: `Custo Total pelas Unidades`
                }
            case 'manual':
            default:
                return { 
                    qty: `Qtd em ${selectedItem.unit}`, 
                    price: `Custo Total para esta Entrada`
                }
        }
    }

    const labels = getDynamicLabels()

    const handleAddPurchase = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedItemId || !quantity || !price) return toast.error("Preencha item, quantidade e valor total.")

        setIsSubmitting(true)
        try {
            await addStockEntry({
                executionId,
                itemId: selectedItemId,
                quantityPurchased: Number(quantity),
                purchaseUnitPrice: Number(price),
                updateAvgCost: selectedItem?.cost_mode === 'manual' ? updateAvgCost : true,
                notes: notes || undefined
            })
            toast.success("Compra adicionada!")
            
            // limpa campos
            setSelectedItemId('')
            setQuantity('')
            setPrice('')
            setNotes('')
            
            await loadPurchases()
        } catch (error: any) {
            toast.error(error.message || "Falha ao registrar compra")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (entryId: string) => {
        if (!confirm("Deseja mesmo arrancar esta compra do histórico de forma permanente?")) return

        setIsDeleting(entryId)
        try {
            await deleteStockEntry(entryId)
            toast.success("Registo deletado.")
            await loadPurchases()
        } catch (error: any) {
            toast.error(error.message || "Erro ao deletar compra")
        } finally {
            setIsDeleting(null)
        }
    }

    const totalValue = purchases.reduce((acc, curr) => {
        // Converted unit cost e converted quantity já guardam a fração nativa.
        return acc + (Number(curr.converted_quantity || 0) * Number(curr.converted_unit_cost || 0))
    }, 0)

    if (loading) {
        return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
    }

    return (
        <div className="p-4 space-y-6 max-w-4xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center space-x-3 mt-2">
                <button onClick={() => router.push(`/dashboard/admin/history/${executionId}`)} className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition active:scale-95">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                        <ShoppingCart className="w-3 h-3" /> Injeção de Estoque
                    </p>
                    <h2 className="text-2xl font-extrabold text-[#B13A2B] tracking-tight">Registro de Compras</h2>
                </div>
            </div>

            {/* Inclusão de Compra Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-5 space-y-5">
                <form onSubmit={handleAddPurchase} className="space-y-4">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 mb-2">Item Recebido</p>
                        <select 
                            value={selectedItemId} 
                            onChange={e => setSelectedItemId(e.target.value)}
                            className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50 font-medium text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#B13A2B]"
                        >
                            <option value="">Selecione um insumo...</option>
                            {items.map(i => (
                                <option key={i.id} value={i.id}>{i.name} (Modo: {i.cost_mode?.toUpperCase() || 'Direto'})</option>
                            ))}
                        </select>
                    </div>

                    {selectedItem && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 pl-1 mb-2">
                                    <Package className="w-3 h-3 text-indigo-500" /> {labels.qty}
                                </label>
                                <input
                                    type="number" step="0.001" required
                                    value={quantity} onChange={e => setQuantity(e.target.value)}
                                    placeholder="Ex: 5"
                                    className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#B13A2B]"
                                />
                                {selectedItem.cost_mode === 'conversion' && (
                                    <p className="text-[10px] text-gray-400 font-medium mt-1 ml-1 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> Fator de Conversão = {selectedItem.conversion_factor || 1} {selectedItem.unit}.
                                    </p>
                                )}
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 pl-1 mb-2">
                                    <DollarSign className="w-3 h-3 text-emerald-600" /> {labels.price}
                                </label>
                                <input
                                    type="number" step="0.01" required
                                    value={price} onChange={e => setPrice(e.target.value)}
                                    placeholder="R$ 0,00"
                                    className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#B13A2B]"
                                />
                            </div>
                        </div>
                    )}

                    {selectedItem?.cost_mode === 'manual' && (
                        <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200 mt-2">
                            <input 
                                type="checkbox" id="updcost"
                                checked={updateAvgCost}
                                onChange={e => setUpdateAvgCost(e.target.checked)}
                                className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500"
                            />
                            <label htmlFor="updcost" className="text-sm font-bold text-amber-800">
                                Atualizar custo médio do produto com os valores em questão
                            </label>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase pl-1 mb-2 block">
                            Observações Gerais da NF ou Fornecedor (Opcional)
                        </label>
                        <input
                            type="text" 
                            value={notes} onChange={e => setNotes(e.target.value)}
                            placeholder="Número da Nota, Fornecedor..."
                            className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#B13A2B]"
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={!selectedItemId || isSubmitting} 
                        className="w-full py-4 rounded-xl text-white font-extrabold shadow-sm bg-[#B13A2B] hover:bg-[#8F2E21] disabled:opacity-40 transition active:scale-95 flex items-center justify-center gap-2 text-sm"
                    >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5" /> Injetar Compra no Ciclo</>}
                    </button>
                </form>
            </div>

            {/* Totalizador */}
            <div className="bg-[#FDF0EF] border border-[#f5ddd9] rounded-2xl p-5 flex items-center justify-between shadow-sm">
                <div>
                    <p className="text-xs font-bold text-[#B13A2B] uppercase tracking-widest">Aporte Financeiro Gerado Mensal</p>
                    <p className="font-extrabold text-2xl text-[#8F2E21]">{formatMoney(totalValue)}</p>
                </div>
                <div className="bg-white rounded-xl p-3 shadow-sm border border-[#f5ddd9]/50">
                    <p className="text-[10px] font-bold text-gray-400 text-center uppercase tracking-widest">Nº De Faturas</p>
                    <p className="font-extrabold text-base text-gray-700 text-center">{purchases.length}</p>
                </div>
            </div>

            {/* Lista Real Histórica */}
            <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 mb-3">Extrato Analítico de Compras</p>
                {purchases.length === 0 ? (
                    <div className="bg-gray-50 border border-dashed border-gray-200 p-8 rounded-2xl text-center">
                        <ShoppingCart className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-gray-600">Nenhum empenho financeiro efetuado.</p>
                        <p className="text-xs text-gray-400 mt-1">Sua prateleira financeira de compras está em R$ 0,00</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {purchases.map(p => (
                            <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">{p.items?.name}</p>
                                        <p className="text-[10px] font-semibold text-indigo-500 uppercase bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100 inline-block mt-0.5">
                                            {p.items?.cost_mode}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => handleDelete(p.id)}
                                        disabled={isDeleting === p.id}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition disabled:opacity-50"
                                        title="Apagar Assinatura de Compra"
                                    >
                                        {isDeleting === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    </button>
                                </div>
                                <div className="space-y-1 mb-3">
                                    <p className="text-xs text-gray-600">Entrada Final Calculada: <strong className="text-gray-900">{p.converted_quantity} {p.items?.unit}</strong></p>
                                    <p className="text-xs text-gray-600">Custo Absoluto: <strong className="text-[#B13A2B]">{formatMoney(p.quantity_purchased * p.purchase_unit_price)}</strong></p>
                                    {p.notes && <p className="text-xs text-gray-400 italic bg-gray-50 border border-gray-100 p-1.5 rounded mt-1">"{p.notes}"</p>}
                                </div>
                                <div className="pt-2 border-t border-gray-100 flex items-center justify-between mt-auto">
                                    <p className="text-[10px] text-gray-400">Recibo: {new Date(p.created_at).toLocaleString('pt-BR')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
