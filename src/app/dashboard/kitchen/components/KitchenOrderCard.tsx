'use client'

import { ChevronRight, Store, Clock, Package } from 'lucide-react'
import Link from 'next/link'
import type { PurchaseOrder } from '@/modules/purchases/types'
import { OrderStatusBadge } from '../../purchases/components/OrderStatusBadge'
import { updateKitchenStatusAction } from '@/modules/purchases/actions'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { useState } from 'react'

interface KitchenOrderCardProps {
    order: PurchaseOrder
    onUpdate: () => void
}

export function KitchenOrderCard({ order, onUpdate }: KitchenOrderCardProps) {
    const [acting, setActing] = useState(false)

    const sentAgo = order.sent_at
        ? formatDistanceToNow(new Date(order.sent_at), { addSuffix: true, locale: ptBR })
        : null

    async function handleStartAnalysis(e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()
        if (order.status !== 'enviado') return
        setActing(true)
        const res = await updateKitchenStatusAction(order.id, 'em_analise')
        if (res.success) {
            onUpdate()
        } else {
            toast.error(res.error ?? 'Erro ao atualizar status')
        }
        setActing(false)
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <Link
                href={`/dashboard/kitchen/${order.id}`}
                className="flex items-start justify-between p-4 gap-3 hover:bg-gray-50/60 transition-colors group"
            >
                <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <Package className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <OrderStatusBadge status={order.status} size="sm" />
                        </div>
                        <p className="text-sm font-black text-gray-900">
                            #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <Store className="w-3 h-3 text-gray-400 shrink-0" />
                            <p className="text-xs text-gray-500 font-medium truncate">{order.store_name}</p>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3 h-3 text-gray-300 shrink-0" />
                            <p className="text-[10px] text-gray-400">{sentAgo ?? 'Agora'}</p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-100 group-hover:bg-orange-600 group-hover:text-white group-hover:border-orange-600 transition-all">
                        <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold">
                        {order.item_count ?? 0} {(order.item_count ?? 0) === 1 ? 'item' : 'itens'}
                    </span>
                </div>
            </Link>

            {/* Quick action: start analysis for new orders */}
            {order.status === 'enviado' && (
                <div className="border-t border-gray-50 px-4 py-2.5">
                    <button
                        onClick={handleStartAnalysis}
                        disabled={acting}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest transition-colors active:scale-[0.98] disabled:opacity-60"
                    >
                        {acting ? (
                            <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        ) : '→ '}
                        Iniciar Análise
                    </button>
                </div>
            )}
        </div>
    )
}
