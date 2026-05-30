'use client'

import { ChevronRight, Store, Clock, Package, Boxes, Trash2 } from 'lucide-react'
import Link from 'next/link'
import type { PurchaseOrder } from '@/modules/purchases/types'
import { OrderStatusBadge } from '../../purchases/components/OrderStatusBadge'
import { updateKitchenStatusAction, deletePurchaseOrderAction } from '@/modules/purchases/actions'
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

    async function handleDelete(e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()
        if (!confirm('Deseja realmente EXCLUIR este pedido permanentemente? Esta ação não pode ser desfeita.')) return
        
        setActing(true)
        const res = await deletePurchaseOrderAction(order.id)
        if (res.success) {
            toast.success('Pedido excluído!')
            onUpdate()
        } else {
            toast.error(res.error ?? 'Erro ao excluir pedido')
        }
        setActing(false)
    }

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all group">
            <Link
                href={`/dashboard/kitchen/${order.id}`}
                className="flex items-start justify-between p-5 gap-4 hover:bg-gray-50/40 transition-colors"
            >
                <div className="flex items-start gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                        <Boxes className="w-6 h-6 text-orange-600" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                            <OrderStatusBadge status={order.status} size="sm" />
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
                            Pedido #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                        <div className="flex items-center gap-2">
                            <Store className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <p className="text-sm font-black text-gray-900 truncate">{order.store_name}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                            <Clock className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                            <p className="text-[10px] font-bold text-gray-400">{sentAgo ?? 'Agora'}</p>
                            <span className="w-1 h-1 rounded-full bg-gray-200" />
                            <Package className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                            <p className="text-[10px] font-bold text-gray-400">
                                {order.item_count ?? 0} {(order.item_count ?? 0) === 1 ? 'item' : 'itens'}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-3 shrink-0">
                    <button
                        onClick={handleDelete}
                        disabled={acting}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Excluir pedido"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="w-8 h-8 bg-gray-50 flex items-center justify-center rounded-xl border border-gray-100 group-hover:bg-orange-600 group-hover:text-white group-hover:border-orange-600 transition-all duration-300">
                        <ChevronRight className="w-4 h-4" />
                    </div>
                </div>
            </Link>

            {/* Quick action button */}
            <div className="px-5 pb-5 pt-0">
                {order.status === 'enviado' ? (
                    <button
                        onClick={handleStartAnalysis}
                        disabled={acting}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-black uppercase tracking-widest transition-all active:scale-[0.98] shadow-sm disabled:opacity-60"
                    >
                        {acting ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            'Abrir Separação'
                        )}
                    </button>
                ) : (
                    <Link
                        href={`/dashboard/kitchen/${order.id}`}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-600 text-[11px] font-black uppercase tracking-widest transition-all active:scale-[0.98] border border-gray-100"
                    >
                        Ver Detalhes
                    </Link>
                )}
            </div>
        </div>
    )
}
