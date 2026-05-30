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
    approveSupplierInvoice,
    processApprovedInvoice,
    getRecentActiveCycles
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
    
    // Status de Processamento (Etapa 4)
    const [activeCycles, setActiveCycles] = useState<any[]>([])
    const [showCycleModal, setShowCycleModal] = useState(false)
    
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
            loadData() // Recarrega para ver mudança de status e botão de processar
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setIsActioning(false)
        }
    }

    const handleProcess = async (cycleId?: string) => {
        setIsActioning(true)
        try {
            const res = await processApprovedInvoice(id as string, cycleId)
            
            if (res.requiresSelection) {
                setActiveCycles(res.activeCycles)
                setShowCycleModal(true)
                return
            }

            toast.success("Entradas de estoque geradas com sucesso!")
            setShowCycleModal(false)
            loadData()
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
    const isProcessed = !!invoice.processed_at

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

            {/* Modal de Seleção de Ciclo (Etapa 4) */}
            {showCycleModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative">
                        <div className="p-6 border-b border-gray-100 bg-amber-50">
                            <h3 className="text-xl font-black text-amber-900 tracking-tight">Vincular Ciclo de Estoque</h3>
                            <p className="text-sm text-amber-700 font-semibold mt-1">
                                Detectamos múltiplos ciclos ativos. Selecione em qual ciclo as entradas desta nota devem ser registradas.
                            </p>
                        </div>
                        <div className="p-4 max-h-[300px] overflow-y-auto space-y-2">
                            {activeCycles.map((c: any) => (
                                <button
                                    key={c.id}
                                    onClick={() => handleProcess(c.id)}
                                    className="w-full p-4 rounded-2xl border border-gray-200 hover:border-amber-500 hover:bg-amber-50 text-left transition-all group"
                                >
                                    <p className="font-extrabold text-gray-900 group-hover:text-amber-900">{(c.routines as any)?.name || 'Ciclo sem nome'}</p>
                                    <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-tighter">Iniciado em {new Date(c.started_at).toLocaleDateString('pt-BR')}</p>
                                </button>
                            ))}
                        </div>
                        <div className="p-4 bg-gray-50 flex gap-3">
                            <button 
                                onClick={() => setShowCycleModal(false)}
                                className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl text-sm hover:bg-gray-100"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Importação NaBrasa</p>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${isProcessed ? 'bg-indigo-100 text-indigo-700' : isApproved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {isProcessed ? 'Processada e Integrada' : isApproved ? 'Aprovada para Estoque' : 'Pendente de Revisão'}
                            </span>
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none mt-1">
                            {isProcessed ? 'Nota Processada' : 'Revisão e Integração'}
                        </h1>
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

                    {!isProcessed && isApproved && (
                        <button 
                            onClick={() => handleProcess()}
                            disabled={isActioning}
                            className="px-6 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-lg hover:bg-indigo-700 transition active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            {isActioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
                            Gerar Entradas de Estoque
                        </button>
                    )}

                    {!isApproved && (
                        <button 
                            onClick={handleApprove}
                            disabled={isActioning}
                            className="px-6 py-2.5 bg-[#B13A2B] text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-lg hover:bg-[#902216] transition active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            {isActioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} 
                            Aprovar Nota agora
                        </button>
                    )}
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

                    {isProcessed && (
                        <div className="bg-indigo-50 rounded-3xl p-5 border border-indigo-100 space-y-3">
                            <h4 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2">
                                <CheckCircle className="w-3 h-3" /> Status do Processamento
                            </h4>
                            <div className="space-y-2">
                                <div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">Processado em</p>
                                    <p className="text-xs font-bold text-gray-700">{new Date(invoice.processed_at).toLocaleString('pt-BR')}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">Ciclo Destino</p>
                                    <p className="text-xs font-bold text-gray-700">{invoice.cycle_id ? 'Vinculado ao Ciclo' : 'Não informado'}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 flex gap-3">
                        <Info className="w-5 h-5 text-indigo-500 shrink-0" />
                        <p className="text-[11px] font-semibold text-indigo-700 leading-relaxed">
                            Vincule cada item da nota ao produto correspondente no seu estoque. 
                            O fator de conversão serve para ajustar unidades (Ex: Nota em KG, Estoque em G).
                        </p>
                    </div>
                </div>

                {/* Lado Direito: Itens (Tabela no Desktop / Cards no Mobile) */}
                <div className="lg:col-span-3 space-y-4">
                    {/* Versão DESKTOP: Tabela */}
                    <div className="hidden md:block bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="p-4 font-bold text-gray-500 uppercase text-[10px] tracking-wider w-[35%]">Item Fornecedor</th>
                                        <th className="p-4 font-bold text-gray-500 uppercase text-[10px] tracking-wider w-[45%]">Mapeamento Interno</th>
                                        <th className="p-4 font-bold text-gray-500 uppercase text-[10px] tracking-wider w-24 text-center">Fator</th>
                                        <th className="p-4 font-bold text-gray-500 uppercase text-[10px] tracking-wider text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {invoice.items.map((item: any) => (
                                        <tr key={item.id} className={`transition-colors hover:bg-gray-50/30 ${item.review_status === 'reviewed' ? 'bg-green-50/20' : ''}`}>
                                            <td className="p-4">
                                                <div className="max-w-[280px]">
                                                    <p className="font-bold text-gray-900 text-xs uppercase truncate" title={item.item_description}>{item.item_description}</p>
                                                    <p className="text-[10px] text-gray-400 mt-1">
                                                        Cód: {item.supplier_item_code} | {item.purchase_quantity} {item.purchase_unit} @ {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.purchase_unit_cost)}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col gap-1">
                                                    <select 
                                                        disabled={isApproved || isActioning || isProcessed}
                                                        value={item.matched_item_id || ''}
                                                        onChange={(e) => handleUpdateRow(item.id, {
                                                            matched_item_id: e.target.value || null,
                                                            conversion_factor_snapshot: item.conversion_factor_snapshot || 1,
                                                            review_notes: item.review_notes
                                                        })}
                                                        className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-[#B13A2B] outline-none shadow-sm disabled:bg-gray-50"
                                                    >
                                                        <option value="">-- Selecione o Ingrediente --</option>
                                                        {internalItems.map((ii: any) => (
                                                            <option key={ii.id} value={ii.id}>{ii.name} ({ii.unit})</option>
                                                        ))}
                                                    </select>
                                                    {item.matched_item_id && (
                                                        <div className="flex items-center gap-1.5 px-1 animate-in fade-in duration-300">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                            <span className="text-[9px] font-black text-green-600 uppercase tracking-tighter">Vinculado ao Sistema</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex justify-center">
                                                    <input 
                                                        type="number"
                                                        disabled={isApproved || isActioning || isProcessed || !item.matched_item_id}
                                                        value={item.conversion_factor_snapshot || 1}
                                                        step="0.001"
                                                        onChange={(e) => handleUpdateRow(item.id, {
                                                            matched_item_id: item.matched_item_id,
                                                            conversion_factor_snapshot: parseFloat(e.target.value),
                                                            review_notes: item.review_notes
                                                        })}
                                                        className="w-20 bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-center text-xs font-extrabold text-gray-900 focus:ring-2 focus:ring-[#B13A2B] outline-none disabled:opacity-30 transition-all"
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex justify-center">
                                                    <button 
                                                        disabled={isApproved || isActioning || isProcessed}
                                                        onClick={() => setItemToDelete(item)}
                                                        className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-0 active:scale-90"
                                                        title="Remover item da nota"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Versão MOBILE: Cards */}
                    <div className="md:hidden space-y-4">
                        {invoice.items.map((item: any) => (
                            <div key={item.id} className={`bg-white rounded-3xl border ${item.review_status === 'reviewed' ? 'border-green-100 shadow-[0_4px_12px_rgb(34,197,94,0.05)]' : 'border-gray-200 shadow-sm'} p-5 space-y-4 transition-all overflow-hidden`}>
                                <div className="flex justify-between items-start gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-extrabold text-gray-900 text-xs uppercase leading-tight">{item.item_description}</p>
                                        <p className="text-[10px] text-gray-400 font-semibold mt-1 uppercase tracking-tight">
                                            {item.purchase_quantity} {item.purchase_unit} • {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.purchase_unit_cost)}
                                        </p>
                                    </div>
                                    {!isApproved && (
                                        <button 
                                            onClick={() => setItemToDelete(item)}
                                            className="p-2.5 bg-gray-50 text-gray-300 hover:text-red-600 rounded-xl active:scale-90 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Mapeamento Interno</label>
                                        <select 
                                            disabled={isApproved || isActioning || isProcessed}
                                            value={item.matched_item_id || ''}
                                            onChange={(e) => handleUpdateRow(item.id, {
                                                matched_item_id: e.target.value || null,
                                                conversion_factor_snapshot: item.conversion_factor_snapshot || 1,
                                                review_notes: item.review_notes
                                            })}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-3.5 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-[#B13A2B] outline-none shadow-inner appearance-none"
                                        >
                                            <option value="">-- Selecione o Ingrediente --</option>
                                            {internalItems.map((ii: any) => (
                                                <option key={ii.id} value={ii.id}>{ii.name} ({ii.unit})</option>
                                            ))}
                                        </select>
                                    </div>

                                    {item.matched_item_id && (
                                        <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3 animate-in fade-in slide-in-from-top-1">
                                            <div className="flex-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1 ml-1">Fator Conv.</label>
                                                <input 
                                                    type="number"
                                                    disabled={isApproved || isActioning}
                                                    value={item.conversion_factor_snapshot || 1}
                                                    step="0.001"
                                                    onChange={(e) => handleUpdateRow(item.id, {
                                                        matched_item_id: item.matched_item_id,
                                                        conversion_factor_snapshot: parseFloat(e.target.value),
                                                        review_notes: item.review_notes
                                                    })}
                                                    className="w-full bg-white border border-gray-100 rounded-xl p-2.5 text-xs font-extrabold text-[#B13A2B] outline-none focus:ring-2 focus:ring-[#B13A2B]"
                                                />
                                            </div>
                                            <div className="flex flex-col items-center justify-center bg-green-500/10 px-4 py-2 rounded-xl">
                                                <CheckCircle className="w-5 h-5 text-green-600 mb-0.5" />
                                                <span className="text-[8px] font-black text-green-700 uppercase">Mapeado</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
