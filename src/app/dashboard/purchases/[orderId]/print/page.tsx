'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getOrderDetailAction } from '@/modules/purchases/actions'
import type { PurchaseOrder } from '@/modules/purchases/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Printer, ArrowLeft } from 'lucide-react'

export default function OrderPrintPage() {
    const params = useParams()
    const router = useRouter()
    const orderId = params.orderId as string

    const [order, setOrder] = useState<PurchaseOrder | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchOrder = useCallback(async () => {
        setLoading(true)
        const res = await getOrderDetailAction(orderId)
        if (res.success && res.data) {
            setOrder(res.data)
        }
        setLoading(false)
    }, [orderId])

    useEffect(() => { fetchOrder() }, [fetchOrder])

    if (loading) {
        return <div className="p-10 text-center text-sm font-bold text-gray-500">Carregando folha do pedido...</div>
    }

    if (!order) return <div className="p-10 text-center text-sm font-bold text-red-500">Pedido não encontrado</div>

    const items = order.items ?? []
    const totalQty = items.reduce((acc, item) => acc + item.requested_qty, 0)
    const totalOrder = items.reduce((acc, item) => acc + (item.requested_qty * (item.unit_price || 0)), 0)
    const hasMissingPrices = items.some(item => !item.unit_price)

    return (
        <div className="min-h-screen bg-gray-100 print:bg-white p-4 sm:p-8">
            {/* Action Bar (Hidden on print) */}
            <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar
                </button>
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 bg-[#B13A2B] text-white rounded-lg text-sm font-bold hover:bg-[#8F2E21] transition-colors shadow-sm"
                >
                    <Printer className="w-4 h-4" />
                    Imprimir Folha
                </button>
            </div>

            {/* A4 Document Area */}
            <div className="max-w-4xl mx-auto bg-white sm:shadow-lg sm:border border-gray-200 print:shadow-none print:border-none p-8 sm:p-12 text-gray-900 font-sans">
                
                {/* Header */}
                <div className="border-b-2 border-gray-900 pb-6 mb-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-tight text-gray-900">
                                Pedido de Abastecimento
                            </h1>
                            <p className="text-sm font-bold text-gray-500 mt-1 uppercase tracking-widest">
                                Nº {order.id.split('-')[0].toUpperCase()}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-gray-800">NaBrasa Controle</p>
                            <p className="text-xs text-gray-500 mt-0.5">{order.store_name}</p>
                        </div>
                    </div>
                </div>

                {/* Info Blocks */}
                <div className="flex flex-wrap gap-8 mb-8">
                    <div className="flex-1 min-w-[200px]">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Destino</p>
                        <p className="text-sm font-bold text-gray-900">Cozinha Central</p>
                    </div>
                    <div className="flex-1 min-w-[150px]">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Data de Emissão</p>
                        <p className="text-sm font-bold text-gray-900">
                            {format(new Date(order.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                    </div>
                    <div className="flex-1 min-w-[150px]">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                        <p className="text-sm font-bold text-gray-900 uppercase">
                            {order.status.replace(/_/g, ' ')}
                        </p>
                    </div>
                </div>

                {/* Items Table */}
                <div className="mb-8 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-gray-900">
                                <th className="py-3 px-2 text-xs font-black text-gray-500 uppercase tracking-wider">Item</th>
                                <th className="py-3 px-2 text-xs font-black text-gray-500 uppercase tracking-wider">Cód / SKU</th>
                                <th className="py-3 px-2 text-xs font-black text-gray-500 uppercase tracking-wider text-right">Qtd</th>
                                <th className="py-3 px-2 text-xs font-black text-gray-500 uppercase tracking-wider">Un</th>
                                <th className="py-3 px-2 text-xs font-black text-gray-500 uppercase tracking-wider text-right">Preço Un</th>
                                <th className="py-3 px-2 text-xs font-black text-gray-500 uppercase tracking-wider text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {items.map((oi) => {
                                const unitPrice = oi.unit_price || 0
                                const rowTotal = oi.requested_qty * unitPrice
                                return (
                                    <tr key={oi.id} className="group hover:bg-gray-50 print:hover:bg-transparent">
                                        <td className="py-3 px-2 text-sm font-bold text-gray-900">{oi.item?.name}</td>
                                        <td className="py-3 px-2 text-xs text-gray-500 font-mono">
                                            {oi.item?.sku || oi.item?.gtin || '-'}
                                        </td>
                                        <td className="py-3 px-2 text-sm font-black text-gray-900 text-right">{oi.requested_qty}</td>
                                        <td className="py-3 px-2 text-xs text-gray-500">{oi.item?.order_unit}</td>
                                        <td className="py-3 px-2 text-sm text-gray-600 text-right">
                                            {oi.unit_price 
                                                ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(unitPrice)
                                                : <span className="text-gray-400 italic text-xs">Sem preço</span>
                                            }
                                        </td>
                                        <td className="py-3 px-2 text-sm font-bold text-gray-900 text-right">
                                            {oi.unit_price 
                                                ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rowTotal)
                                                : '-'
                                            }
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Summary & Totals */}
                <div className="flex flex-col sm:flex-row justify-between gap-8 border-t-2 border-gray-900 pt-6">
                    {/* Notes */}
                    <div className="flex-1">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Observações</p>
                        {order.notes ? (
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.notes}</p>
                        ) : (
                            <p className="text-sm text-gray-400 italic">Nenhuma observação registrada.</p>
                        )}
                        {hasMissingPrices && (
                            <p className="text-xs text-amber-600 font-bold mt-4">
                                * Existem itens sem preço definido neste pedido.
                            </p>
                        )}
                    </div>

                    {/* Totals Table */}
                    <div className="w-full sm:w-64">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-xs font-bold text-gray-500 uppercase">Itens únicos</span>
                            <span className="text-sm font-bold text-gray-900">{items.length}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-xs font-bold text-gray-500 uppercase">Soma de Qtd</span>
                            <span className="text-sm font-bold text-gray-900">{totalQty}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 mt-1">
                            <span className="text-sm font-black text-gray-900 uppercase">Total Estimado</span>
                            <span className="text-lg font-black text-[#B13A2B]">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalOrder)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Print Footer */}
                <div className="mt-16 pt-8 border-t border-gray-200 text-center text-xs text-gray-400 print:block hidden">
                    Gerado pelo NaBrasa Controle em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
                </div>

            </div>
        </div>
    )
}
