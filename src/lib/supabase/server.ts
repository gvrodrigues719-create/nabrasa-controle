import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createServerClient() {
    const cookieStore = await cookies()
    const cookieString = cookieStore.getAll().map(c => `${c.name}=${encodeURIComponent(c.value)}`).join('; ')

    // Encaminhando o header de Cookie ativo da request atual para o client SSR.
    // Isso delega o parse do 'sb-*-auth-token' e refresh de sessão ao próprio padrão do SupabaseJS.
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                persistSession: false, // Padrão recomendado em server SSR (sessão vive no browser)
            },
            global: {
                headers: {
                    Cookie: cookieString
                }
            }
        }
    )
}
