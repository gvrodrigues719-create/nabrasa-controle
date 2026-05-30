import { createClient } from '@supabase/supabase-js'

/**
 * Cria uma instância do Supabase Client com a Service Role Key.
 * Bypassa as políticas de RLS (Row Level Security).
 * DEVE SER USADO APENAS EM SERVER ACTIONS / SERVER COMPONENTS APÓS VALIDAÇÃO DE PERMISSÃO.
 */
export function getAdminSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
        throw new Error('Variáveis de ambiente do Supabase ausentes para o Admin Client')
    }

    return createClient(url, key)
}
