'use client'

import { useState } from 'react'
import { Minus, Plus, Trash2, MessageSquare, X } from 'lucide-react'
import type { PurchaseOrderItem } from '@/modules/purchases/types'

interface OrderItemRowProps {
    orderItem: PurchaseOrderItem
    editable?: boolean
    onQtyChange?: (orderItemId: string, newQty: number) => void
    onRemove?: (orderItemId: string) => void
    showSeparated?: boolean
    showReceived?: boolean
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

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                {/* Item info */}
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-gray-900 leading-tight">{item?.name ?? 'Item'}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
                            {item?.category ?? ''}
                        </span>
                        {orderItem.notes && (
                            <button
                                onClick={() => setShowNotes(v => !v)}
                                className="flex items-center gap-1 text-[10px] font-bold text-amber-600"
                            >
                                <MessageSquare className="w-3 h-3" />
                                Obs
                            </button>
                        )}
                    </div>
                    {showNotes && orderItem.notes && (
                        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-2 border border-amber-100">
                            {orderItem.notes}
                        </p>
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
                            <span className="text-lg font-black text-gray-900">{orderItem.requested_qty}</span>
                            <span className="text-xs text-gray-400 ml-1">{unit}</span>
                        </div>
                    )}

                    {showSeparated && (
                        <div className="text-right">
                            <span className="text-xs text-gray-400">Separado: </span>
                            <span className={`text-xs font-black ${orderItem.separated_qty != null
                                ? orderItem.separated_qty === orderItem.requested_qty
                                    ? 'text-emerald-600'
                                    : 'text-amber-600'
                                : 'text-gray-300'}`}>
                                {orderItem.separated_qty != null ? `${orderItem.separated_qty} ${unit}` : '—'}
                            </span>
                        </div>
                    )}

                    {showReceived && (
                        <div className="text-right">
                            <span className="text-xs text-gray-400">Recebido: </span>
                            <span className={`text-xs font-black ${orderItem.received_qty != null
                                ? orderItem.received_qty === orderItem.separated_qty
                                    ? 'text-emerald-600'
                                    : 'text-red-500'
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
        </div>
    )
}
