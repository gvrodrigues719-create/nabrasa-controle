'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useDashboardIdentity } from '../../hooks/useDashboardIdentity'

export default function IcaraiRouteGuard({ children }: { children: React.ReactNode }) {
    const { unitName, loadingIdentity } = useDashboardIdentity()
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        if (loadingIdentity || !unitName) return

        const isIcarai = unitName.includes('Icaraí')
        
        if (isIcarai && pathname) {
            // Blocked routes for Icaraí
            const blockedPaths = [
                '/dashboard/mural',
                '/dashboard/areas',
                '/dashboard/checklist',
                '/dashboard/kitchen',
                '/dashboard/admin',
                '/dashboard/losses',
                '/dashboard/cmv'
            ]

            const isBlocked = blockedPaths.some(p => pathname.startsWith(p))

            if (isBlocked) {
                // Redirect back to dashboard home if trying to access a blocked route
                router.replace('/dashboard')
            }
        }
    }, [unitName, loadingIdentity, pathname, router])

    return <>{children}</>
}
