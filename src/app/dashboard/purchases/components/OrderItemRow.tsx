'use client'

import { useState } from 'react'
import { Minus, Plus, Trash2, MessageSquare } from 'lucide-react'
import type { PurchaseOrderItem } from '@/modules/purchases/types'

interface OrderItemRowProps {
    orderItem: PurchaseOrderItem
    editable?: boolean
    onQtyChange?: (orderItemId: string, newQty: number) => void
    onRemove?: (orderItemId: string) => void
    showSeparated?: boolean
    showReceived?: boolean
}

function qtyEqual(a: number | null | undefined, b: number | null | undefined): boolean {
    return Math.abs(Number(a ?? 0) - Number(b ?? 0)) < 0.0001
}

export function OrderItemRow({
    orderItem,
    editable = false,
    onQtyChange,
    onRemove,
    showSeparated = false,
    showReceived = false,
}: OrderItemRowProps) {
    const item = orderItem.item
    const [showNotes, setShowNotes] = useState(false)
    const allowsDecimal = item?.allows_decimal ?? false
    const unit = item?.order_unit ?? 'un'

    const hasSepNotes = !!orderItem.separation_notes
    const hasRecvNotes = !!orderItem.received_notes

    function handleDecrement() {
        const step = allowsDecimal ? 0.5 : 1
        const newQty = Math.max(step, orderItem.requested_qty - step)
        onQtyChange?.(orderItem.id, newQty)
    }

    function handleIncrement() {
        const step = allowsDecimal ? 0.5 : 1
        onQtyChange?.(orderItem.id, orderItem.requested_qty + step)
    }

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        const val = allowsDecimal ? parseFloat(e.target.value) : parseInt(e.target.value)
        if (!isNaN(val) && val > 0) onQtyChange?.(orderItem.id, val)
    }

    const sepDiff = showSeparated && orderItem.separated_qty != null && !qtyEqual(orderItem.requested_qty, orderItem.separated_qty)
    const recvDiff = showReceived && orderItem.received_qty != null && !qtyEqual(orderItem.separated_qty ?? orderItem.requested_qty, orderItem.received_qty)

    return (
        <div className={`bg-white rounded-2xl border p-4 shadow-sm ${sepDiff || recvDiff ? 'border-amber-200' : 'border-gray-100'}`}>
            <div className="flex items-start justify-between gap-3">
                {/* Item info */}
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-gray-900 leading-tight">{item?.name ?? 'Item'}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
                            {item?.category ?? ''}
                        </span>
                        {(hasSepNotes || hasRecvNotes) && (
                            <button
                                onClick={() => setShowNotes(v => !v)}
                                className="flex items-center gap-1 text-[10px] font-bold text-amber-600"
                            >
                                <MessageSquare className="w-3 h-3" />
                                Obs
                            </button>
                        )}
                    </div>

                    {showNotes && (
                        <div className="mt-2 space-y-1">
                            {hasSepNotes && (
                                <p className="text-xs text-orange-700 bg-orange-50 rounded-lg px-3 py-1.5 border border-orange-100">
                                    <span className="font-black text-[10px] uppercase tracking-widest block mb-0.5">Obs. fábrica:</span>
                                    {orderItem.separation_notes}
                                </p>
                            )}
                            {hasRecvNotes && (
                                <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-1.5 border border-blue-100">
                                    <span className="font-black text-[10px] uppercase tracking-widest block mb-0.5">Obs. recebimento:</span>
                                    {orderItem.received_notes}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Quantity control */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                    {editable ? (
                        <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1 border border-gray-100">
                            <button
                                onClick={handleDecrement}
                                className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-100 text-gray-600 active:scale-90 transition-transform"
                            >
                                <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                                type="number"
                                value={orderItem.requested_qty}
                                onChange={handleInputChange}
                                min={allowsDecimal ? 0.5 : 1}
                                step={allowsDecimal ? 0.5 : 1}
                                className="w-12 text-center text-sm font-black text-gray-900 bg-transparent border-none focus:outline-none"
                            />
                            <button
                                onClick={handleIncrement}
                                className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-100 text-gray-600 active:scale-90 transition-transform"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ) : (
                        <div className="text-right">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Pedido original</p>
                            <span className="text-lg font-black text-gray-900">{orderItem.requested_qty}</span>
                            <span className="text-xs text-gray-400 ml-1">{unit}</span>
                        </div>
                    )}

                    {showSeparated && (
                        <div className="text-right">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Separado pela fábrica</p>
                            <span className={`text-sm font-black ${orderItem.separated_qty != null
                                ? sepDiff ? 'text-amber-600' : 'text-emerald-600'
                                : 'text-gray-300'}`}>
                                {orderItem.separated_qty != null ? `${orderItem.separated_qty} ${unit}` : '—'}
                            </span>
                        </div>
                    )}

                    {showReceived && (
                        <div className="text-right">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Recebido na loja</p>
                            <span className={`text-sm font-black ${orderItem.received_qty != null
                                ? recvDiff ? 'text-red-500' : 'text-emerald-600'
                                : 'text-gray-300'}`}>
                                {orderItem.received_qty != null ? `${orderItem.received_qty} ${unit}` : '—'}
                            </span>
                        </div>
                    )}
                </div>

                {editable && onRemove && (
                    <button
                        onClick={() => onRemove(orderItem.id)}
                        className="w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all shrink-0 mt-0.5"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* Price and Subtotal */}
            {orderItem.unit_price != null && (
                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                    <div className="text-[10px] font-bold text-gray-400">
                        Preço un: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orderItem.unit_price)}
                    </div>
                    <div className="text-xs font-black text-gray-900">
                        Subtotal: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orderItem.requested_qty * orderItem.unit_price)}
                    </div>
                </div>
            )}
        </div>
    )
}
