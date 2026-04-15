'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Save, Search, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function InvoiceMappingPage() {
    const router = useRouter()
    const { id } = useParams()
    
    const [invoice, setInvoice] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!id) return
        loadInvoice()
    }, [id])

    const loadInvoice = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('supplier_invoices')
                .select(`
                    *,
                    supplier_invoice_items (*)
                `)
                .eq('id', id)
                .single()
            
            if (error) throw error
            setInvoice(data)
        } catch (e: any) {
            toast.error("Erro ao carregar a nota")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-4 space-y-6 max-w-5xl mx-auto pb-24">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => router.push('/dashboard/admin/cmv/invoices')} 
                        className="p-2 bg-white border border-gray-200 rounded-xl shadow-sm text-gray-600 hover:bg-gray-50 transition active:scale-95"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Etapa 3: Classificação</p>
                        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Conciliação de Itens</h1>
                    </div>
                </div>
                {invoice && (
                    <button disabled className="px-6 py-2.5 bg-[#B13A2B] text-white font-bold text-sm rounded-xl flex items-center gap-2 opacity-50 cursor-not-allowed">
                        <CheckCircle className="w-4 h-4" /> Finalizar Nota
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-[#B13A2B]" />
                </div>
            ) : invoice ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Invoice Card */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-black text-gray-900">{invoice.supplier_name}</h2>
                                <p className="text-sm font-semibold text-gray-400">CNPJ: {invoice.supplier_document}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Valor da Nota</p>
                                <p className="text-xl font-black text-[#B13A2B]">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoice.total_amount)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Alert Etapa 3 */}
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
                        <Search className="w-5 h-5 text-indigo-600 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-indigo-900">Etapa 3 será iniciada aqui</p>
                            <p className="text-xs text-indigo-700 mt-1">
                                O próximo passo do projeto é permitir que você vincule cada item da NFe (lado esquerdo) a um ingrediente (lado direito) em sua tabela de CMV.
                            </p>
                        </div>
                    </div>

                    {/* Items Table Mockup */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="p-4 font-bold text-gray-500 uppercase text-[10px] tracking-wider w-1/2">Item na Nota (Fornecedor)</th>
                                    <th className="p-4 font-bold text-gray-500 uppercase text-[10px] tracking-wider w-1/2">Vincular com Ingrediente Interno</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {invoice.supplier_invoice_items?.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4">
                                            <p className="font-bold text-gray-900 text-xs">{item.item_description}</p>
                                            <p className="text-[10px] text-gray-400 uppercase mt-1">
                                                Cód: {item.supplier_item_code} | EAN: {item.ean || '-'}
                                                <br/>
                                                Qtde: {item.purchase_quantity} {item.purchase_unit} — Custo Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.purchase_total_cost)}
                                            </p>
                                        </td>
                                        <td className="p-4">
                                            {/* Placeholder combo/search */}
                                            <div className="w-full bg-gray-50 border border-dashed border-gray-300 rounded-lg p-3 text-center cursor-not-allowed">
                                                <p className="text-xs font-semibold text-gray-400">Em desenvolvimento (Etapa 3)</p>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="text-center py-20">
                    <p className="text-gray-400 font-bold">Nota não encontrada</p>
                </div>
            )}
        </div>
    )
}
