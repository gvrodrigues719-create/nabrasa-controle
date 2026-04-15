'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Loader2, Plus, Search, CheckCircle, X, Box, Trash2 } from 'lucide-react'
import { getSupplierInvoices, previewInvoiceXml, confirmImportInvoice, deleteSupplierInvoice } from '@/app/actions/invoiceImportActions'
import { ParsedInvoiceResult } from '@/modules/invoice-import/types'
import toast from 'react-hot-toast'
import { ConfirmModal } from '@/components/ConfirmModal'

export default function InvoicesPage() {
    const router = useRouter()
    const [invoices, setInvoices] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    const [invoiceToDelete, setInvoiceToDelete] = useState<any>(null)

    // Etapa 2 States
    const [previewData, setPreviewData] = useState<ParsedInvoiceResult | null>(null)
    const [isImporting, setIsImporting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        loadInvoices()
    }, [])

    const loadInvoices = async () => {
        setLoading(true)
        try {
            const res = await getSupplierInvoices()
            if (res.success) setInvoices(res.data)
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteInvoice = async () => {
        if (!invoiceToDelete) return
        setIsDeleting(invoiceToDelete.id)
        try {
            await deleteSupplierInvoice(invoiceToDelete.id)
            toast.success("Nota excluída com sucesso")
            loadInvoices()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setInvoiceToDelete(null)
            setIsDeleting(null)
        }
    }

    const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsImporting(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await previewInvoiceXml(formData)
            setPreviewData(res)
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setIsImporting(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleConfirmImport = async () => {
        if (!previewData) return
        setIsImporting(true)
        try {
            await confirmImportInvoice(previewData)
            toast.success("Nota XML importada com sucesso!")
            setPreviewData(null)
            loadInvoices()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setIsImporting(false)
        }
    }

    return (
        <div className="p-4 space-y-6 max-w-5xl mx-auto pb-24">
            {/* Oculto: Input do XML */}
            <input 
                type="file" 
                ref={fileInputRef} 
                accept=".xml" 
                className="hidden" 
                onChange={handleFileSelected} 
            />

            {/* Header */}
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => router.push('/dashboard/admin/cmv')} 
                    className="p-2 bg-white border border-gray-200 rounded-xl shadow-sm text-gray-600 hover:bg-gray-50 transition active:scale-95"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">CMV & Compras</p>
                    <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Importação de Notas</h1>
                </div>
            </div>

            <ConfirmModal 
                isOpen={!!invoiceToDelete}
                title="Excluir Nota?"
                message={`Você tem certeza que deseja excluir a nota de ${invoiceToDelete?.supplier_name}? Esta ação não pode ser desfeita.`}
                onCancel={() => setInvoiceToDelete(null)}
                onConfirm={handleDeleteInvoice}
            />

            {/* Preview de Nova Nota (Etapa 2) */}
            {previewData && previewData.header && previewData.items ? (
                <div className="bg-white border border-[#B13A2B]/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-6 border-b border-gray-100 bg-[#FDF0EF]">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[#B13A2B] font-bold text-xs uppercase tracking-wider mb-1">Prévia da Importação</p>
                                <h2 className="text-2xl font-black text-gray-900">{previewData.header.supplier_name}</h2>
                                <p className="text-sm font-semibold text-gray-500">CNPJ: {previewData.header.supplier_document}</p>
                            </div>
                            <button 
                                onClick={() => setPreviewData(null)}
                                className="p-2 text-gray-400 hover:text-gray-600 bg-white rounded-full shadow-sm"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    
                    <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 bg-white">
                        <div className="bg-gray-50 p-4 rounded-xl">
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Nota / Série</p>
                            <p className="font-bold text-gray-900">{previewData.header.invoice_number} / {previewData.header.invoice_series || '-'}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl">
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Emissão</p>
                            <p className="font-bold text-gray-900">{new Date(previewData.header.issued_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl">
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Total de Itens</p>
                            <p className="font-bold text-gray-900 flex items-center gap-1"><Box className="w-4 h-4 text-[#B13A2B]" /> {previewData.items.length}</p>
                        </div>
                        <div className="bg-[#B13A2B]/5 p-4 rounded-xl border border-[#B13A2B]/10">
                            <p className="text-[10px] text-[#B13A2B] font-bold uppercase">Valor Total (NF)</p>
                            <p className="font-black text-[#B13A2B] text-lg">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(previewData.header.total_amount)}
                            </p>
                        </div>
                        <div className="col-span-2 md:col-span-4 bg-gray-50 p-4 rounded-xl">
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Chave de Acesso</p>
                            <p className="font-mono text-xs font-bold text-gray-700 break-all">{previewData.header.invoice_key}</p>
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                        <button 
                            onClick={() => setPreviewData(null)}
                            disabled={isImporting}
                            className="px-6 py-3 font-bold text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleConfirmImport}
                            disabled={isImporting}
                            className="px-6 py-3 bg-[#B13A2B] hover:bg-[#902216] text-white font-bold text-sm rounded-xl transition shadow-md flex items-center gap-2 disabled:opacity-50"
                        >
                            {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                            Confirmar Importação
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Toolbar Default */}
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Buscar por fornecedor ou número da nota..."
                                className="w-full pl-9 p-2.5 border border-gray-200 rounded-xl bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#B13A2B] shadow-sm"
                            />
                        </div>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isImporting}
                            className="px-6 py-2.5 bg-[#B13A2B] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-[#902216] transition shadow-md active:scale-95 disabled:opacity-50"
                        >
                            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Importar XML
                        </button>
                    </div>

                    {/* Histórico Content */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-10 h-10 animate-spin text-[#B13A2B]" />
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Carregando histórico...</p>
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className="bg-white border border-dashed border-gray-200 rounded-3xl p-16 text-center shadow-sm">
                            <div className="bg-gray-50 p-4 rounded-full w-fit mx-auto mb-4">
                                <FileText className="w-12 h-12 text-gray-200" />
                            </div>
                            <p className="font-bold text-gray-400">Nenhuma nota fiscal encontrada</p>
                            <p className="text-xs text-gray-400 mt-2">Clique em "Importar XML" para adicionar a primeira nota de fornecedor ao sistema.</p>
                        </div>
                    ) : (
                        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="p-4 font-bold text-gray-500 uppercase text-[10px] tracking-wider">Nota / Fornecedor</th>
                                        <th className="p-4 font-bold text-gray-500 uppercase text-[10px] tracking-wider text-right">Valor Total</th>
                                        <th className="p-4 font-bold text-gray-500 uppercase text-[10px] tracking-wider text-center">Status</th>
                                        <th className="p-4 font-bold text-gray-500 uppercase text-[10px] tracking-wider">Importador</th>
                                        <th className="p-4 font-bold text-gray-500 uppercase text-[10px] tracking-wider text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {invoices.map(inv => (
                                        <tr 
                                            key={inv.id} 
                                            className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                                            onClick={() => router.push(`/dashboard/admin/cmv/invoices/${inv.id}`)}
                                        >
                                            <td className="p-4">
                                                <p className="font-bold text-gray-900">{inv.supplier_name}</p>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-tight">Nota #{inv.invoice_number} • <span className="font-mono">{inv.supplier_document}</span></p>
                                            </td>
                                            <td className="p-4 text-right font-bold text-gray-700">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inv.total_amount)}
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${inv.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-xs font-semibold text-gray-500">
                                                {inv.users?.name || 'Sistema'}
                                                <div className="text-[9px] font-normal text-gray-400 mt-0.5">{new Date(inv.created_at).toLocaleDateString('pt-BR')}</div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setInvoiceToDelete(inv);
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Excluir Nota"
                                                >
                                                    {isDeleting === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
