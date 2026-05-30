'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useDashboardIdentity } from '../../hooks/useDashboardIdentity'
import { getUnitFeatureFlags } from '@/lib/feature-flags'

export default function IcaraiRouteGuard({ children }: { children: React.ReactNode }) {
    const { unitId, loadingIdentity } = useDashboardIdentity()
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        if (loadingIdentity) return

        const flags = getUnitFeatureFlags(unitId)
        
        if (flags.isContagemOnly && pathname) {
            // Allowlist para Icaraí (Contagem Only)
            const allowedPaths = [
                '/dashboard',
                '/dashboard/profile',
                '/dashboard/routines',
                '/dashboard/count',
                '/dashboard/history'
            ]

            if (flags.supplyOrders) {
                allowedPaths.push('/dashboard/purchases')
            }

            const isAllowed = allowedPaths.some(p => pathname === p || pathname.startsWith(p + '/'))

            if (!isAllowed) {
                // Redireciona de volta para a Home se tentar acessar uma rota não permitida (Mural, Perdas, etc.)
                router.replace('/dashboard')
            }
        }
    }, [unitId, loadingIdentity, pathname, router])

    return <>{children}</>
}
