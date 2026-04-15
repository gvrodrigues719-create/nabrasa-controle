'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Loader2, Plus, Search, AlertCircle } from 'lucide-react'
import { getSupplierInvoices } from '@/app/actions/invoiceImportActions'
import toast from 'react-hot-toast'

export default function InvoicesPage() {
    const router = useRouter()
    const [invoices, setInvoices] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

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

    return (
        <div className="p-4 space-y-6 max-w-5xl mx-auto pb-24">
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

            {/* Etapa 1 Placeholder Alert */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
                <AlertCircle className="w-5 h-5 text-indigo-600 mt-0.5" />
                <div>
                    <p className="text-sm font-bold text-indigo-900">Etapa 1: Estrutura Base</p>
                    <p className="text-xs text-indigo-700 mt-1">
                        A base de banco de dados e relacionamentos foi criada. Esta tela está preparada para listar os XMLs importados nas próximas etapas.
                    </p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar por fornecedor ou número da nota..."
                        className="w-full pl-9 p-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#B13A2B] shadow-sm"
                    />
                </div>
                <button 
                    disabled 
                    className="px-6 py-2.5 bg-gray-100 text-gray-400 font-bold text-sm rounded-xl flex items-center justify-center gap-2 cursor-not-allowed border border-gray-200"
                >
                    <Plus className="w-4 h-4" /> Importar XML (Etapa 2)
                </button>
            </div>

            {/* Main Content */}
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
                    <p className="text-xs text-gray-400 mt-2">Aguardando a implementação do parser de XML na Etapa 2.</p>
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="p-4 font-bold text-gray-500 uppercase text-[10px] tracking-wider">Nota / Fornecedor</th>
                                <th className="p-4 font-bold text-gray-500 uppercase text-[10px] tracking-wider text-right">Valor Total</th>
                                <th className="p-4 font-bold text-gray-500 uppercase text-[10px] tracking-wider text-center">Status</th>
                                <th className="p-4 font-bold text-gray-500 uppercase text-[10px] tracking-wider">Importado em</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {invoices.map(inv => (
                                <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer">
                                    <td className="p-4">
                                        <p className="font-bold text-gray-900">{inv.supplier_name}</p>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-tight">Nota #{inv.invoice_number}</p>
                                    </td>
                                    <td className="p-4 text-right font-bold text-gray-700">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inv.total_amount)}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${inv.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                            {inv.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-xs text-gray-500">
                                        {new Date(inv.created_at).toLocaleDateString('pt-BR')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
