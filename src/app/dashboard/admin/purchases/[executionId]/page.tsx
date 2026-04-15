'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { addStockEntry, getStockEntries, deleteStockEntry } from '@/app/actions/stockActions'
import { Loader2, ArrowLeft, PackagePlus, Trash2, PlusCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { ConfirmModal } from '@/components/ConfirmModal'

type Item = {
    id: string
    name: string
    unit: string
    cost_mode: 'direct' | 'conversion' | 'manual'
    purchase_unit: string | null
    conversion_factor: number | null
}

export default function PurchasesPage() {
    const params = useParams()
    const router = useRouter()
    const executionId = params.executionId as string

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [items, setItems] = useState<Item[]>([])
    const [entries, setEntries] = useState<any[]>([])
    const [entryToDelete, setEntryToDelete] = useState<string | null>(null)

    // Form states
    const [selectedItemId, setSelectedItemId] = useState('')
    const [qty, setQty] = useState('')
    const [price, setPrice] = useState('')
    const [notes, setNotes] = useState('')
    const [updateAvgCost, setUpdateAvgCost] = useState(false)

    useEffect(() => {
        if (!executionId) return
        fetchData()
    }, [executionId])

    const fetchData = async () => {
        setLoading(true)
        try {
            // Buscando itens ativos disponíveis para compra
            const { data: itemsData } = await supabase.from('items').select('id, name, unit, cost_mode, purchase_unit, conversion_factor').eq('active', true).order('name')
            if (itemsData) setItems(itemsData as Item[])

            await fetchEntries()
        } catch (err: any) {
            toast.error("Erro ao carregar dados.")
        } finally {
            setLoading(false)
        }
    }

    const fetchEntries = async () => {
        try {
            const res = await getStockEntries(executionId)
            if (res.success) {
                setEntries(res.data)
            }
        } catch (error: any) {
            console.error(error)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedItemId || !qty || !price) {
            toast.error("Preencha todos os campos obrigatórios.")
            return
        }

        setSubmitting(true)
        try {
            await addStockEntry({
                executionId,
                itemId: selectedItemId,
                quantityPurchased: Number(qty),
                purchaseUnitPrice: Number(price),
                notes,
                updateAvgCost
            })
            toast.success("Compra registrada com sucesso!")
            
            // Clean form
            setSelectedItemId('')
            setQty('')
            setPrice('')
            setNotes('')
            setUpdateAvgCost(false)

            await fetchEntries()
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (!entryToDelete) return
        try {
            await deleteStockEntry(entryToDelete)
            toast.success("Compra excluída.")
            setEntryToDelete(null)
            await fetchEntries()
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    // Calculo totais
    const totalPurchases = entries.reduce((acc, curr) => acc + (Number(curr.converted_quantity) * Number(curr.converted_unit_cost)), 0)

    const selectedItemDef = items.find(i => i.id === selectedItemId)

    return (
        <div className="p-4 space-y-6 max-w-5xl mx-auto">
            <ConfirmModal
                isOpen={!!entryToDelete}
                title="Excluir Compra"
                message="Tem certeza que deseja excluir esta entrada? O Custo Médio não será recalculado automaticamente."
                confirmText="Excluir"
                onCancel={() => setEntryToDelete(null)}
                onConfirm={handleDelete}
            />

            <div className="flex items-center space-x-4 mb-4">
                <button onClick={() => router.push(`/dashboard/admin/history/${executionId}`)} className="p-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Compras do Ciclo</h2>
                    <p className="text-sm text-gray-500 font-medium">Lançamento de notas e entradas de estoque.</p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[#B13A2B]" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Formulário */}
                    <div className="md:col-span-1">
                        <form onSubmit={handleSave} className="bg-white p-5 rounded-2xl shadow-lg border border-[#FDF0EF] flex flex-col space-y-4 sticky top-[120px]">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <PackagePlus className="w-5 h-5 text-[#B13A2B]" /> Registrar compra
                            </h3>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Item</label>
                                <select 
                                    required 
                                    value={selectedItemId} 
                                    onChange={e => setSelectedItemId(e.target.value)} 
                                    className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl mt-1.5 outline-none focus:ring-2 focus:ring-[#B13A2B] text-gray-900 text-sm font-medium"
                                >
                                    <option value="" disabled>Selecione um item...</option>
                                    {items.map(i => (
                                        <option key={i.id} value={i.id}>{i.name}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedItemDef && (
                                <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    
                                    {/* MODO DIRETO */}
                                    {selectedItemDef.cost_mode === 'direct' && (
                                        <>
                                            <div>
                                                <label className="text-xs font-bold text-gray-600">Quantidade comprada ({selectedItemDef.unit})</label>
                                                <input required type="number" step="0.01" value={qty} onChange={e => setQty(e.target.value)} className="w-full border border-gray-200 bg-white p-3 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-[#B13A2B]" placeholder={`Ex: 10`} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-600">Preço pago ({selectedItemDef.unit})</label>
                                                <input required type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="w-full border border-gray-200 bg-white p-3 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-[#B13A2B]" placeholder={`R$ por cada ${selectedItemDef.unit}`} />
                                            </div>
                                            {(Number(qty) > 0 && Number(price) > 0) && (
                                                <div className="text-xs text-brand-600 font-semibold text-[#B13A2B]">
                                                    Total final da compra: R$ { (Number(qty) * Number(price)).toLocaleString('pt-BR', {minimumFractionDigits: 2}) }
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* MODO CONVERSAO */}
                                    {selectedItemDef.cost_mode === 'conversion' && (
                                        <>
                                            <div>
                                                <label className="text-xs font-bold text-gray-600 flex items-center gap-1">Quantidade comprada <span className="bg-white border text-[10px] px-1 rounded uppercase">{selectedItemDef.purchase_unit || '?'}</span></label>
                                                <input required type="number" step="0.01" value={qty} onChange={e => setQty(e.target.value)} className="w-full border border-gray-200 bg-white p-3 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-[#B13A2B]" placeholder="Quantos comprou?" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-600">Preço pago por {selectedItemDef.purchase_unit || 'unidade'}</label>
                                                <input required type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="w-full border border-gray-200 bg-white p-3 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-[#B13A2B]" placeholder={`Custo por cada ${selectedItemDef.purchase_unit || 'unidade'}`} />
                                            </div>
                                            
                                            {(Number(qty) > 0 && Number(price) > 0) && (
                                                <div className="mt-2 bg-[#FDF0EF] p-2 rounded-lg border border-[#f5ddd9]">
                                                    <p className="text-xs text-[#B13A2B] font-semibold flex items-center gap-1">
                                                        <AlertCircle className="w-3.5 h-3.5"/> Entrada gerada no estoque:
                                                    </p>
                                                    <p className="text-xs text-[#8F2E21] mt-1 font-medium bg-white px-2 py-1 rounded inline-block">
                                                        = { (Number(qty) * Number(selectedItemDef.conversion_factor)).toFixed(2) } {selectedItemDef.unit} a R$ {(Number(price) / Number(selectedItemDef.conversion_factor)).toLocaleString('pt-BR', {minimumFractionDigits:4})} / {selectedItemDef.unit}
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* MODO MANUAL */}
                                    {selectedItemDef.cost_mode === 'manual' && (
                                        <>
                                            <div>
                                                <label className="text-xs font-bold text-gray-600">Quantidade entrada no estoque ({selectedItemDef.unit})</label>
                                                <input required type="number" step="0.01" value={qty} onChange={e => setQty(e.target.value)} className="w-full border border-gray-200 bg-white p-3 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-[#B13A2B]" placeholder="Qtd adicionada" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-600">Custo imputado (por {selectedItemDef.unit})</label>
                                                <input required type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="w-full border border-gray-200 bg-white p-3 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-[#B13A2B]" placeholder="R$" />
                                            </div>
                                            <div className="flex items-center space-x-2 pt-2">
                                                <input type="checkbox" id="updateAvg" checked={updateAvgCost} onChange={e => setUpdateAvgCost(e.target.checked)} className="w-4 h-4 text-[#B13A2B] rounded border-gray-300 focus:ring-[#B13A2B] cursor-pointer" />
                                                <label htmlFor="updateAvg" className="text-xs font-semibold text-gray-700 cursor-pointer select-none">
                                                    Atualizar custo médio principal com esta entrada
                                                </label>
                                            </div>
                                        </>
                                    )}

                                </div>
                            )}

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Observação / NF (Opcional)</label>
                                <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl mt-1.5 outline-none focus:ring-2 focus:ring-[#B13A2B] text-gray-900 text-sm" placeholder="Ex: NF 12345" />
                            </div>

                            <button disabled={submitting} className="w-full py-4 mt-2 bg-[#B13A2B] text-white rounded-xl font-bold flex justify-center items-center shadow-sm hover:bg-[#8F2E21] transition active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed">
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><PlusCircle className="w-5 h-5 mr-2"/> Registrar Compra</>}
                            </button>
                        </form>
                    </div>

                    {/* Lista e Totais */}
                    <div className="md:col-span-2 space-y-4">
                        
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex justify-between items-center bg-[url('https://www.transparenttextures.com/patterns/cartographer.png')]">
                            <div>
                                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Total de Compras</p>
                                <p className="text-3xl font-black text-gray-900">
                                    R$ {totalPurchases.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="bg-[#B13A2B] text-white py-1 px-3 rounded-full text-sm font-bold">{entries.length} registros</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {entries.length === 0 ? (
                                <div className="text-center py-10 px-4 text-gray-500 bg-white rounded-2xl border border-gray-200 border-dashed">
                                    <p className="font-medium text-gray-600">Nenhuma compra listada neste ciclo ainda.</p>
                                </div>
                            ) : (
                                entries.map(entry => (
                                    <div key={entry.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-start group">
                                        <div>
                                            <h4 className="font-extrabold text-gray-900">{entry.items?.name || 'Item desconhecido'}</h4>
                                            
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm">
                                                <p className="text-gray-600">
                                                    Entrou: <span className="font-bold text-gray-900">{Number(entry.converted_quantity).toLocaleString('pt-BR')} {entry.items?.unit}</span>
                                                </p>
                                                <p className="text-gray-600">
                                                    Custo Unit: <span className="font-bold text-gray-900">R$ {Number(entry.converted_unit_cost).toLocaleString('pt-BR', { minimumFractionDigits: 4 })}</span>
                                                </p>
                                                <p className="text-gray-600">
                                                    <span className="font-bold text-[#B13A2B]">Total: R$ {(Number(entry.converted_quantity) * Number(entry.converted_unit_cost)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                </p>
                                            </div>

                                            {entry.notes && (
                                                <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded-lg border border-gray-100 inline-block font-medium">Nota: {entry.notes}</p>
                                            )}
                                        </div>
                                        <div>
                                            <button onClick={() => setEntryToDelete(entry.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition opacity-70 group-hover:opacity-100 active:scale-95">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                    </div>
                </div>
            )}
        </div>
    )
}
