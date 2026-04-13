'use server'

import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Acesso irrestrito de backend (service_role) para poder verificar a tabela fechada
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY!.substring(0, 32)

function encryptId(text: string) {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(SECRET), iv)
    let encrypted = cipher.update(text)
    encrypted = Buffer.concat([encrypted, cipher.final()])
    return iv.toString('hex') + ':' + encrypted.toString('hex')
}

function decryptId(text: string) {
    try {
        const textParts = text.split(':')
        const iv = Buffer.from(textParts.shift()!, 'hex')
        const encryptedText = Buffer.from(textParts.join(':'), 'hex')
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(SECRET), iv)
        let decrypted = decipher.update(encryptedText)
        decrypted = Buffer.concat([decrypted, decipher.final()])
        return decrypted.toString()
    } catch {
        return null
    }
}

export async function loginOperatorWithPin(userId: string, pin: string) {
    const { data: isValid, error } = await supabase.rpc('verify_user_pin', { p_user_id: userId, p_pin: pin })

    if (error || !isValid) {
        return { success: false, error: 'PIN Incorreto ou usuário sem PIN configurado.' }
    }

    const { data: usr } = await supabase.from('users').select('name, role').eq('id', userId).single()

    const payload = JSON.stringify({ userId, name: usr?.name, role: usr?.role })
    const cookieStore = await cookies()
    cookieStore.set('operator_session', encryptId(payload), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 12 // 12 horas de sessão operacional
    })

    return { success: true }
}

export async function logoutOperator() {
    const cookieStore = await cookies()
    cookieStore.delete('operator_session')
    return { success: true }
}

export async function getActiveOperator() {
    const cookieStore = await cookies()
    const session = cookieStore.get('operator_session')?.value
    if (!session) return null
    const decrypted = decryptId(session)
    if (!decrypted) return null
    return JSON.parse(decrypted) as { userId: string, name: string, role: string }
}
