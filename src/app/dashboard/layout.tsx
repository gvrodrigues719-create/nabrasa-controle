import { getActiveOperator } from '@/app/actions/pinAuth'
import ClientDashboardLayout from './ClientLayout'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const op = await getActiveOperator()

    return (
        <ClientDashboardLayout initialOp={op}>
            {children}
        </ClientDashboardLayout>
    )
}

