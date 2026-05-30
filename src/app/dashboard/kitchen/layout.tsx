import { redirect } from 'next/navigation'
import { getActiveOperator } from '@/app/actions/pinAuth'
import { createClient } from '@supabase/supabase-js'

// Service role client para verificação server-side (não depende de RLS de frontend)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function KitchenLayout({ children }: { children: React.ReactNode }) {
    const op = await getActiveOperator()

    if (op) {
        // Acesso permitido para:
        // 1. Role 'kitchen' (abordagem limpa, futura)
        // 2. Nome 'Cozinha Central' (workaround compatível atual)
        // 3. Admin / Manager (auditoria e supervisão)
        const isKitchen = op.role === 'kitchen' || op.name === 'Cozinha Central'
        const isAllowed = op.role === 'admin' || isKitchen

        if (!isAllowed) {
            redirect('/dashboard')
        }
    } else {
        // Sem sessão de operador PIN — verifica sessão web (admin/manager logado via email)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) redirect('/login')

        const { data: userData } = await supabase
            .from('users')
            .select('role, name')
            .eq('id', user.id)
            .single()

        const isKitchen = userData?.role === 'kitchen' || userData?.name === 'Cozinha Central'
        const isAllowed = userData?.role === 'admin' || isKitchen

        if (!isAllowed) {
            redirect('/dashboard')
        }
    }

    return <>{children}</>
}
