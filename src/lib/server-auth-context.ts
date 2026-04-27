import { cookies } from 'next/headers'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'

// Service role needed to read users table ignoring RLS
function getServiceSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return null
    return createClient(url, key)
}

function getSecret() {
    const key = process.env.SESSION_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) return null
    if (key.length < 32) {
        return Buffer.from(key.padEnd(32, '0')).slice(0, 32)
    }
    return Buffer.from(key).slice(0, 32)
}

function decryptId(text: string) {
    try {
        const secret = getSecret()
        if (!secret) return null
        const textParts = text.split(':')
        const iv = Buffer.from(textParts.shift()!, 'hex')
        const encryptedText = Buffer.from(textParts.join(':'), 'hex')
        const decipher = crypto.createDecipheriv('aes-256-cbc', secret, iv)
        let decrypted = decipher.update(encryptedText)
        decrypted = Buffer.concat([decrypted, decipher.final()])
        return decrypted.toString()
    } catch {
        return null
    }
}

export async function getServerAuthContext() {
    // 1. Tentar ler sessão de operador (PIN) diretamente (sem "use server" limits)
    const cookieStore = await cookies()
    const opSession = cookieStore.get('operator_session')?.value
    
    let userId: string | null = null

    if (opSession) {
        const decrypted = decryptId(opSession)
        if (decrypted) {
            const parsed = JSON.parse(decrypted)
            userId = parsed.userId
        }
    }

    // 2. Fallback: Supabase Auth nativo
    if (!userId) {
        try {
            const supabaseServer = await createServerClient()
            const { data: { user } } = await supabaseServer.auth.getUser()
            if (user) userId = user.id
        } catch (e) {
            // Ignorar erro silenciosamente
        }
    }

    // 3. Fallback: Dev Bypass
    if (!userId && process.env.DEV_AUTH_BYPASS === 'true' && process.env.NODE_ENV !== 'production') {
        userId = 'b4ac5ffd-40c3-46b1-9508-a1219cb925b6'
    }

    if (!userId) {
        throw new Error('Sessão operacional não encontrada. Faça login novamente.')
    }

    // Buscar perfil real do usuário via service role (bypassa RLS)
    const adminClient = getServiceSupabase()
    if (!adminClient) throw new Error('Erro interno de servidor.')

    const { data: profile } = await adminClient
        .from('users')
        .select('id, name, role, primary_group_id')
        .eq('id', userId)
        .single()

    if (!profile) {
        throw new Error('Perfil não encontrado.')
    }

    return profile as { id: string; name: string; role: string; primary_group_id: string | null }
}
