export const dynamic = 'force-dynamic'
import { requireManagerOrAdmin } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import AdminShell from './AdminShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    try {
        await requireManagerOrAdmin()
    } catch (e) {
        console.warn("[AdminAuthGate] Acesso negado, redirecionando...", e)
        redirect('/dashboard')
    }

    return (
        <AdminShell>
            {children}
        </AdminShell>
    )
}
