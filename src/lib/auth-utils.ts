import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveOperator } from '@/app/actions/pinAuth'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function requireManagerOrAdmin() {
    // 0. Bypass de DEV (Apenas se configurado explicitamente)
    if (process.env.DEV_AUTH_BYPASS === 'true') {
        console.warn("⚠️ MODO DE BYPASS DE AUTENTICAÇÃO ATIVO (DEV_AUTH_BYPASS)")
        return "b4ac5ffd-40c3-46b1-9508-a1219cb925b6" 
    }

    let userId: string | null = null

    // 1. Tenta Auth nativo do Supabase primeiro
    try {
        const supabaseServer = await createServerClient()
        const { data: { user } } = await supabaseServer.auth.getUser()
        if (user) {
            userId = user.id
        }
    } catch (e) {
        console.error("Falha ao consultar usuário via cookie Supabase:", e)
    }

    // 2. Fallback: Tenta Cookie PIN operacional caso Auth nativo falhe
    if (!userId) {
        try {
            const op = await getActiveOperator()
            if (op) userId = op.userId
        } catch (e) {
            console.error("Falha ao consultar operador via cookie PIN:", e)
        }
    }

    if (!userId) {
        throw new Error("Usuário não autenticado no servidor. Por favor, faça login ou informe seu PIN.")
    }
    
    // 3. Valida no perfil real do usuário
    // Usamos o supabaseAdmin para garantir que podemos ler o perfil mesmo com RLS restrito
    const { data: usr, error } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()
    
    if (error || !usr) {
        console.error("Erro ao validar credenciais no banco:", error)
        throw new Error("Erro ao validar permissões do usuário.")
    }

    if (usr.role !== 'admin' && usr.role !== 'manager') {
        throw new Error("Acesso negado: Este módulo exige perfil de Gerente ou Administrador.")
    }
    
    return userId
}
