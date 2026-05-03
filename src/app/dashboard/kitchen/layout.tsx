import { redirect } from 'next/navigation'
import { getActiveOperator } from '@/app/actions/pinAuth'
import { supabase } from '@/lib/supabase/client'

export default async function KitchenLayout({ children }: { children: React.ReactNode }) {
    const op = await getActiveOperator()
    const { data: { user } } = await supabase.auth.getUser()

    if (op) {
        // Apenas Cozinha Central ou admin podem acessar a tela da cozinha
        // Guilherme Gerente pode acessar por enquanto para testes se o user quiser, mas idealmente só admin ou kitchen.
        if (op.name !== 'Cozinha Central' && op.role !== 'admin' && op.role !== 'manager') {
            redirect('/dashboard')
        }
    } else if (!user) {
        redirect('/login')
    }

    return <>{children}</>
}
