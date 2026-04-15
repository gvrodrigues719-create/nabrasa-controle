'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Save, Search, CheckCircle, Trash2, AlertCircle, Info } from 'lucide-react'
import { 
    getSupplierInvoiceDetail, 
    getAllItemsForMapping, 
    updateInvoiceItemReview, 
    deleteSupplierInvoice, 
    deleteSupplierInvoiceItem,
    approveSupplierInvoice
} from '@/app/actions/invoiceImportActions'
import toast from 'react-hot-toast'
import { ConfirmModal } from '@/components/ConfirmModal'

export default function InvoiceMappingPage() {
    const router = useRouter()
    const { id } = useParams()
    
    const [invoice, setInvoice] = useState<any>(null)
    const [internalItems, setInternalItems] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isActioning, setIsActioning] = useState(false)
    
    // Modais
    const [showDeleteInvoice, setShowDeleteInvoice] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<any>(null)

    useEffect(() => {
        if (!id) return
        loadData()
    }, [id])

    const loadData = async () => {
        setLoading(true)
        try {
            const [invRes, itemsRes] = await Promise.all([
                getSupplierInvoiceDetail(id as string),
                getAllItemsForMapping()
            ])
            setInvoice(invRes.data)
            setInternalItems(itemsRes)
        } catch (e: any) {
            toast.error("Erro ao carregar dados: " + e.message)
        } finally {
            setLoading(false)
        }
    }

    const reloadInvoice = async () => {
        try {
            const res = await getSupplierInvoiceDetail(id as string)
            setInvoice(res.data)
        } catch (e: any) {
            toast.error("Erro ao atualizar dados")
        }
    }

    const handleUpdateRow = async (itemId: string, data: any) => {
        try {
            await updateInvoiceItemReview(itemId, data)
            toast.success("Linha atualizada", { duration: 1000 })
            reloadInvoice()
        } catch (e: any) {
            toast.error(e.message)
        }
    }

    const handleDeleteItem = async () => {
        if (!itemToDelete) return
        setIsActioning(true)
        try {
            await deleteSupplierInvoiceItem(itemToDelete.id)
            toast.success("Item removido")
            reloadInvoice()
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setItemToDelete(null)
            setIsActioning(false)
        }
    }

    const handleDeleteInvoice = async () => {
        setIsActioning(true)
        try {
            await deleteSupplierInvoice(id as string)
            toast.success("Nota excluída")
            router.push('/dashboard/admin/cmv/invoices')
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setIsActioning(false)
        }
    }

    const handleApprove = async () => {
        setIsActioning(true)
        try {
            await approveSupplierInvoice(id as string)
            toast.success("Nota aprovada com sucesso!")
            router.push('/dashboard/admin/cmv/invoices')
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setIsActioning(false)
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-[#B13A2B]" />
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Carregando detalhes da nota...</p>
            </div>
        )
    }

    if (!invoice) return <div className="p-10 text-center font-bold text-gray-400">Nota não encontrada.</div>

    const isApproved = invoice.status === 'approved'

    return (
        <div className="p-4 space-y-6 max-w-6xl mx-auto pb-24">
            {/* Modais */}
            <ConfirmModal 
                isOpen={showDeleteInvoice}
                title="Excluir Nota?"
                message="Isso removerá esta nota e todos os seus itens permanentemente."
                onCancel={() => setShowDeleteInvoice(false)}
                onConfirm={handleDeleteInvoice}
            />
            <ConfirmModal 
                isOpen={!!itemToDelete}
                title="Remover Item?"
                message={`Deseja remover o item "${itemToDelete?.item_description}" desta nota?`}
                onCancel={() => setItemToDelete(null)}
                onConfirm={handleDeleteItem}
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => router.push('/dashboard/admin/cmv/invoices')} 
                        className="p-2 bg-white border border-gray-200 rounded-xl shadow-sm text-gray-600 hover:bg-gray-50 transition active:scale-95"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Etapa 3: Revisão</p>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${isApproved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {invoice.status}
                            </span>
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none mt-1">Revisão de Itens</h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!isApproved && (
                        <button 
                            onClick={() => setShowDeleteInvoice(true)}
                            className="px-4 py-2.5 bg-white border border-gray-200 text-red-600 font-bold text-xs rounded-xl hover:bg-red-50 transition active:scale-95 flex items-center gap-2 shadow-sm"
                        >
                            <Trash2 className="w-4 h-4" /> Excluir Nota
                        </button>
                    )}
                    <button 
                        onClick={handleApprove}
                        disabled={isApproved || isActioning}
                        className="px-6 py-2.5 bg-[#B13A2B] text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-lg hover:bg-[#902216] transition active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        {isActioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} 
                        {isApproved ? 'Nota Aprovada' : 'Finalizar e Aprovar'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Lado Esquerdo: Info da Nota */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-gray-50 bg-gray-50/30">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Fornecedor</p>
                            <h2 className="font-black text-gray-900 leading-tight">{invoice.supplier_name}</h2>
                            <p className="text-xs font-semibold text-gray-500 mt-1">{invoice.supplier_document}</p>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Número / Série</p>
                                <p className="text-sm font-bold text-gray-800">{invoice.invoice_number} / {invoice.invoice_series || '-'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Data Emissão</p>
                                <p className="text-sm font-bold text-gray-800">{new Date(invoice.issued_at).toLocaleDateString('pt-BR')}</p>
                            </div>
                            <div className="pt-2 border-t border-gray-50">
                                <p className="text-[10px] text-[#B13A2B] font-bold uppercase mb-0.5">Valor Total</p>
                                <p className="text-xl font-black text-[#B13A2B]">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoice.total_amount)}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 flex gap-3">
                        <Info className="w-5 h-5 text-indigo-500 shrink-0" />
                        <p className="text-[11px] font-semibold text-indigo-700 leading-relaxed">
                            Vincule cada item da nota ao produto correspondente no seu estoque. 
                            O fator de conversão serve para ajustar unidades (Ex: Nota em KG, Estoque em G).
                        </p>
                    </div>
                </div>

                {/* Lado Direito: Grid de Itens */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="p-4 font-bold text-gray-500 uppercase text-[10px] tracking-wider">Item Fornecedor</th>
                                        <th className="p-4 font-bold text-gray-500 uppercase text-[10px] tracking-wider">Mapeamento Interno</th>
                                        <th className="p-4 font-bold text-gray-500 uppercase text-[10px] tracking-wider w-24 text-center">Fator</th>
                                        <th className="p-4 font-bold text-gray-500 uppercase text-[10px] tracking-wider text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {invoice.items.map((item: any) => (
                                        <tr key={item.id} className={`transition-colors ${item.review_status === 'reviewed' ? 'bg-green-50/30' : ''}`}>
                                            <td className="p-4 max-w-xs">
                                                <div className="truncate">
                                                    <p className="font-bold text-gray-900 text-xs uppercase">{item.item_description}</p>
                                                    <p className="text-[10px] text-gray-400 mt-1">
                                                        Cód: {item.supplier_item_code} | {item.purchase_quantity} {item.purchase_unit} @ {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.purchase_unit_cost)}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <select 
                                                    disabled={isApproved || isActioning}
                                                    value={item.matched_item_id || ''}
                                                    onChange={(e) => handleUpdateRow(item.id, {
                                                        matched_item_id: e.target.value || null,
                                                        conversion_factor_snapshot: item.conversion_factor_snapshot || 1,
                                                        review_notes: item.review_notes
                                                    })}
                                                    className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-[#B13A2B] outline-none"
                                                >
                                                    <option value="">Não vinculado</option>
                                                    {internalItems.map((ii: any) => (
                                                        <option key={ii.id} value={ii.id}>{ii.name} ({ii.unit})</option>
                                                    ))}
                                                </select>
                                                {item.matched_item_id && (
                                                    <div className="flex items-center gap-1 mt-1 px-1">
                                                        <CheckCircle className="w-3 h-3 text-green-500" />
                                                        <span className="text-[9px] font-bold text-green-600 uppercase">Mapeado</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <input 
                                                    type="number"
                                                    disabled={isApproved || isActioning || !item.matched_item_id}
                                                    value={item.conversion_factor_snapshot || 1}
                                                    step="0.001"
                                                    onChange={(e) => handleUpdateRow(item.id, {
                                                        matched_item_id: item.matched_item_id,
                                                        conversion_factor_snapshot: parseFloat(e.target.value),
                                                        review_notes: item.review_notes
                                                    })}
                                                    className="w-20 bg-gray-50 border border-gray-200 rounded-lg p-2 text-center text-xs font-bold text-gray-900 focus:ring-2 focus:ring-[#B13A2B] outline-none disabled:opacity-30"
                                                />
                                            </td>
                                            <td className="p-4 text-center">
                                                <button 
                                                    disabled={isApproved || isActioning}
                                                    onClick={() => setItemToDelete(item)}
                                                    className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-0"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

