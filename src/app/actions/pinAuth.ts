'use server'

import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Acesso irrestrito de backend (service_role) para poder verificar a tabela fechada
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getSecret() {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) return null
    return key.substring(0, 32)
}

function encryptId(text: string) {
    const secret = getSecret()
    if (!secret) return text // Fallback inseguro mas evita crash fatal
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secret), iv)
    let encrypted = cipher.update(text)
    encrypted = Buffer.concat([encrypted, cipher.final()])
    return iv.toString('hex') + ':' + encrypted.toString('hex')
}

function decryptId(text: string) {
    try {
        const secret = getSecret()
        if (!secret) return null
        const textParts = text.split(':')
        const iv = Buffer.from(textParts.shift()!, 'hex')
        const encryptedText = Buffer.from(textParts.join(':'), 'hex')
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secret), iv)
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
    if (process.env.DEV_AUTH_BYPASS === 'true') {
        return { userId: 'b4ac5ffd-40c3-46b1-9508-a1219cb925b6', name: 'Admin (Bypass)', role: 'admin' }
    }
    const cookieStore = await cookies()
    const session = cookieStore.get('operator_session')?.value
    if (!session) return null
    const decrypted = decryptId(session)
    if (!decrypted) return null
    return JSON.parse(decrypted) as { userId: string, name: string, role: string }
}

export async function getActiveEmployeesAction() {
    const { data, error } = await supabase.from('users').select('id, name, role').eq('active', true).order('name')
    if (error) return { success: false, error: error.message }
    return { success: true, data }
}
