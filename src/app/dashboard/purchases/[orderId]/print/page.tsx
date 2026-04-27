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
        <div className="min-h-screen bg-gray-100 print:bg-white p-4 sm:p-8 print:p-0">
            <style jsx global>{`
                @page { size: A4 portrait; margin: 8mm; }
                @media print {
                    html, body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .print-hidden { display: none !important; }
                    .print-sheet {
                        box-shadow: none !important;
                        border: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        width: 100% !important;
                        max-width: none !important;
                    }
                    table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    thead { display: table-header-group; }
                }
            `}</style>
            {/* Action Bar (Hidden on print) */}
            <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print-hidden">
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
            <div className="print-sheet max-w-4xl mx-auto bg-white sm:shadow-lg sm:border border-gray-200 p-6 sm:p-8 text-gray-900 font-sans">
                
                {/* Header */}
                <div className="flex justify-between items-start border-b border-gray-900 pb-3 mb-4">
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-tight text-gray-900">
                            Pedido de Abastecimento
                        </h1>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                            Nº {order.id.split('-')[0].toUpperCase()}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold text-gray-800">NaBrasa Controle</p>
                        <p className="text-xs text-gray-500">{order.store_name}</p>
                    </div>
                </div>

                {/* Info Blocks */}
                <div className="flex gap-4 mb-4">
                    <div className="flex-1 border border-gray-300 p-2 rounded-sm">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Destino</p>
                        <p className="text-xs font-bold text-gray-900">Cozinha Central</p>
                    </div>
                    <div className="flex-1 border border-gray-300 p-2 rounded-sm">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Data de Emissão</p>
                        <p className="text-xs font-bold text-gray-900">
                            {format(new Date(order.created_at), "dd/MM/yyyy")}
                        </p>
                    </div>
                    <div className="flex-1 border border-gray-300 p-2 rounded-sm">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Status</p>
                        <p className="text-sm font-bold text-gray-900 uppercase">
                            {order.status.replace(/_/g, ' ')}
                        </p>
                    </div>
                </div>

                {/* Items Table */}
                <div className="mb-4">
                    <table className="w-full text-left border-collapse border border-gray-300 text-[11px]">
                        <colgroup>
                            <col style={{ width: '60%' }} />
                            <col style={{ width: '8%' }} />
                            <col style={{ width: '7%' }} />
                            <col style={{ width: '12%' }} />
                            <col style={{ width: '13%' }} />
                        </colgroup>
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-300">
                                <th className="border-r border-gray-300 py-1.5 px-2 font-black text-gray-600 uppercase tracking-wider">Item</th>
                                <th className="border-r border-gray-300 py-1.5 px-2 font-black text-gray-600 uppercase tracking-wider text-right">Qtd</th>
                                <th className="border-r border-gray-300 py-1.5 px-2 font-black text-gray-600 uppercase tracking-wider text-center">Un</th>
                                <th className="border-r border-gray-300 py-1.5 px-2 font-black text-gray-600 uppercase tracking-wider text-right">Preço Un</th>
                                <th className="py-1.5 px-2 font-black text-gray-600 uppercase tracking-wider text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((oi) => {
                                const unitPrice = oi.unit_price || 0
                                const rowTotal = oi.requested_qty * unitPrice
                                return (
                                    <tr key={oi.id} className="border-b border-gray-300 last:border-b-0 break-inside-avoid">
                                        <td className="border-r border-gray-300 py-1 px-2 font-bold text-gray-900">{oi.item?.name}</td>
                                        <td className="border-r border-gray-300 py-1 px-2 font-black text-gray-900 text-right">{oi.requested_qty}</td>
                                        <td className="border-r border-gray-300 py-1 px-2 text-[10px] text-gray-500 text-center">{oi.item?.order_unit}</td>
                                        <td className="border-r border-gray-300 py-1 px-2 text-gray-600 text-right">
                                            {oi.unit_price 
                                                ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(unitPrice)
                                                : '-'
                                            }
                                        </td>
                                        <td className="py-1 px-2 font-bold text-gray-900 text-right">
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

                {/* Summary & Notes Row */}
                <div className="flex flex-col sm:flex-row gap-4 break-inside-avoid">
                    {/* Notes */}
                    <div className="flex-1 flex flex-col gap-3">
                        <div className="border border-gray-300 p-3 rounded-sm bg-gray-50/50">
                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Observações da Loja Solicitante</p>
                            {order.notes ? (
                                <p className="text-[11px] text-gray-800 whitespace-pre-wrap leading-tight">{order.notes}</p>
                            ) : (
                                <p className="text-[11px] text-gray-400 italic">Nenhuma observação registrada.</p>
                            )}
                        </div>

                        <div className="border border-gray-300 p-3 rounded-sm bg-gray-50/50">
                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Observações da Cozinha Central</p>
                            {order.kitchen_notes ? (
                                <p className="text-[11px] text-gray-800 whitespace-pre-wrap leading-tight">{order.kitchen_notes}</p>
                            ) : (
                                <p className="text-[11px] text-gray-400 italic">Nenhuma observação registrada.</p>
                            )}
                        </div>

                        {hasMissingPrices && (
                            <p className="text-[9px] text-gray-500 font-bold mt-1">
                                * Nota: Itens sem preço não somam no total estimado.
                            </p>
                        )}
                    </div>

                    {/* Totals Box */}
                    <div className="w-full sm:w-64 border border-gray-300 p-3 rounded-sm bg-gray-50/30">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] font-bold text-gray-500 uppercase">Número de itens</span>
                            <span className="text-xs font-bold text-gray-900">{items.length}</span>
                        </div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] font-bold text-gray-500 uppercase">Soma das quantidades</span>
                            <span className="text-xs font-bold text-gray-900">{totalQty}</span>
                        </div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] font-bold text-gray-500 uppercase">Total de produtos</span>
                            <span className="text-xs font-bold text-gray-900">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalOrder)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-300">
                            <span className="text-[10px] font-black text-gray-900 uppercase">Total do Pedido</span>
                            <span className="text-sm font-black text-gray-900">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalOrder)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Print Footer */}
                <div className="mt-8 pt-4 border-t border-gray-200 text-center text-[10px] text-gray-400 print-hidden">
                    Gerado pelo NaBrasa Controle em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
                </div>

            </div>
        </div>
    )
}
