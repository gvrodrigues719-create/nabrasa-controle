'use client'

import { ORDER_STATUS_CONFIG, type OrderStatus } from '@/modules/purchases/types'

interface OrderStatusBadgeProps {
    status: OrderStatus
    size?: 'sm' | 'md'
    showDot?: boolean
}

export function OrderStatusBadge({ status, size = 'md', showDot = true }: OrderStatusBadgeProps) {
    const config = ORDER_STATUS_CONFIG[status]
    if (!config) return null

    const textSize = size === 'sm' ? 'text-[9px]' : 'text-[10px]'
    const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1'
    const dotSize = size === 'sm' ? 'w-1 h-1' : 'w-1.5 h-1.5'

    return (
        <span
            className={`inline-flex items-center gap-1.5 ${padding} rounded-full border font-black uppercase tracking-widest ${textSize} ${config.color} ${config.textColor} ${config.borderColor}`}
        >
            {showDot && (
                <span className={`${dotSize} rounded-full ${config.dotColor} shrink-0`} />
            )}
            {config.label}
        </span>
    )
}
