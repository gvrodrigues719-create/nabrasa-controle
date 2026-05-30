import { getActiveOperator } from '@/app/actions/pinAuth'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientDashboardLayout from './ClientLayout'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    const op = await getActiveOperator()
    const hasManagerSession = !!user

    if (!op && !hasManagerSession) {
        redirect('/login')
    }

    return (
        <ClientDashboardLayout initialOp={op} hasManagerSession={hasManagerSession}>
            {children}
        </ClientDashboardLayout>
    )
}
