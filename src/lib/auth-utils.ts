import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveOperator } from '@/app/actions/pinAuth'

function getServiceSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return null
    return createClient(url, key)
}

/**
 * Resolve o contexto do usuário autenticado a partir de múltiplas fontes:
 * 1. Supabase Auth (Cookie nativo)
 * 2. Operador PIN (Cookie operacional encrypted)
 * 3. DEV Bypass (se ativo)
 */
export async function getAuthenticatedUserContext() {
    // 0. Bypass de DEV (Apenas se configurado explicitamente)
    if (process.env.DEV_AUTH_BYPASS === 'true') {
        const isProd = process.env.NODE_ENV === 'production'
        if (!isProd) {
            console.warn("⚠️ MODO DE BYPASS DE AUTENTICAÇÃO ATIVO (DEV_AUTH_BYPASS)")
            return {
                userId: "b4ac5ffd-40c3-46b1-9508-a1219cb925b6",
                name: "Admin (Bypass)",
                role: "admin",
                source: "bypass"
            }
        } else {
            console.error("❌ DEV_AUTH_BYPASS proibido em produção!")
        }
    }

    // 1. Tenta Auth nativo do Supabase primeiro
    try {
        const supabaseServer = await createServerClient()
        const { data: { user } } = await supabaseServer.auth.getUser()
        if (user) {
            const supabaseAdmin = getServiceSupabase()
            if (supabaseAdmin) {
                const { data: profile } = await supabaseAdmin
                    .from('users')
                    .select('name, role, active')
                    .eq('id', user.id)
                    .single()

                return {
                    userId: user.id,
                    name: profile?.name || user.email,
                    role: profile?.role || 'operator',
                    source: 'supabase'
                }
            }
        }
    } catch (e) {
        console.error("Falha ao consultar usuário via cookie Supabase:", e)
    }

    // 2. Fallback: Tenta Cookie PIN operacional caso Auth nativo falhe
    try {
        const op = await getActiveOperator()
        if (op) {
            return {
                userId: op.userId,
                name: op.name,
                role: op.role,
                source: 'pin'
            }
        }
    } catch (e) {
        console.error("Falha ao consultar operador via cookie PIN:", e)
    }

    return null
}

/**
 * Helper rápido para pegar apenas o ID do usuário autenticado
 */
export async function getAuthenticatedUserId() {
    const context = await getAuthenticatedUserContext()
    return context?.userId || null
}

/**
 * Bloqueia chamadas de API/Server Actions para a unidade Icaraí (Contagem Only).
 */
export async function requireNotIcarai() {
    const ctx = await getAuthenticatedUserContext()
    if (ctx?.name?.includes('Icaraí')) {
        throw new Error('Acesso negado: Funcionalidade não liberada para a Operação Icaraí no momento.')
    }
}

/**
 * Middleware para Server Actions e API Routes que exige perfil administrativo.
 * Revalida o role DIRETAMENTE NO BANCO para evitar uso de cookies antigos/rebaixados.
 */
export async function requireManagerOrAdmin() {
    const context = await getAuthenticatedUserContext()

    if (!context) {
        throw new Error("Usuário não autenticado no servidor. Por favor, faça login ou informe seu PIN.")
    }

    // Revalida role no banco — cookie pode estar desatualizado se o gerente foi rebaixado
    const supabaseAdmin = getServiceSupabase()
    if (supabaseAdmin) {
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('id, role, active')
            .eq('id', context.userId)
            .limit(1)
            .single()

        if (!user) {
            throw new Error("Usuário não encontrado no banco.")
        }

        if (!user.active) {
            throw new Error("Usuário inativo.")
        }

        if (user.role !== 'admin' && user.role !== 'manager') {
            throw new Error("Acesso negado: Este módulo exige perfil de Gerente ou Administrador.")
        }

        return context.userId
    }

    // Fallback sem supabase admin: usa role do cookie
    if (context.role !== 'admin' && context.role !== 'manager') {
        throw new Error("Acesso negado: Este módulo exige perfil de Gerente ou Administrador.")
    }

    return context.userId
}
