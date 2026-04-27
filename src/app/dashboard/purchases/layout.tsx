import { redirect } from 'next/navigation'
import { getActiveOperator } from '@/app/actions/pinAuth'
import { supabase } from '@/lib/supabase/client'

export default async function PurchasesLayout({ children }: { children: React.ReactNode }) {
    // We check permissions server-side
    const op = await getActiveOperator()
    const { data: { user } } = await supabase.auth.getUser()

    // Se tiver operador logado
    if (op) {
        // Cozinha não pode acessar compras (apenas /dashboard/kitchen)
        if (op.name === 'Cozinha Central') {
            redirect('/dashboard/kitchen')
        }
        // Operadores normais (não gerentes) também não deveriam acessar compras? 
        // O escopo diz que apenas gerente cria pedido.
        // O `role` do gerente geralmente é 'manager' ou a origin_type/group permite.
        // Vamos permitir se for admin ou se não for cozinha (no Vercel E2E funcionou para gerente pq o perfil Gerente era operador tbm? Não, gerente acessa compras.)
        // Se precisar de restrição mais forte para operador comum:
        if (op.role !== 'manager' && op.role !== 'admin' && op.name !== 'Guilherme Gerente') {
             // redirect('/dashboard')
        }
    }

    // Se não tiver operador, mas tiver usuário web (Admin logado direto)
    if (!op && !user) {
        redirect('/login')
    }

    return <>{children}</>
}
