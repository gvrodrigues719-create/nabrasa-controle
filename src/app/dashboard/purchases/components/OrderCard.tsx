'use client'

import { ChevronRight, Package, Store } from 'lucide-react'
import Link from 'next/link'
import type { PurchaseOrder } from '@/modules/purchases/types'
import { OrderStatusBadge } from './OrderStatusBadge'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface OrderCardProps {
    order: PurchaseOrder
    basePath?: string // '/dashboard/purchases' | '/dashboard/kitchen'
}

export function OrderCard({ order, basePath = '/dashboard/purchases' }: OrderCardProps) {
    const createdAgo = formatDistanceToNow(new Date(order.created_at), {
        addSuffix: true,
        locale: ptBR,
    })

    const sentAgo = order.sent_at
        ? formatDistanceToNow(new Date(order.sent_at), { addSuffix: true, locale: ptBR })
        : null

    return (
        <Link
            href={`${basePath}/${order.id}`}
            className="block bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:border-gray-200 hover:shadow-md transition-all active:scale-[0.98] group"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <Package className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <OrderStatusBadge status={order.status} size="sm" />
                        </div>
                        <p className="text-sm font-black text-gray-900 truncate">
                            Pedido #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <Store className="w-3 h-3 text-gray-400 shrink-0" />
                            <p className="text-xs text-gray-400 truncate">{order.store_name || 'Loja'}</p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-100 group-hover:bg-gray-900 group-hover:text-white group-hover:border-gray-900 transition-all">
                        <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {order.item_count ?? 0} {(order.item_count ?? 0) === 1 ? 'item' : 'itens'}
                </span>
                <span className="text-[10px] text-gray-400">
                    {sentAgo ? `Enviado ${sentAgo}` : `Criado ${createdAgo}`}
                </span>
            </div>
        </Link>
    )
}
