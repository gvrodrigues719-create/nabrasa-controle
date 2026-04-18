'use server'

import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUserId } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type LossInput = {
    itemId: string
    userId: string
    quantity: number
    category: 'quebra' | 'estragado' | 'preparo' | 'vencido' | 'outro'
    observation?: string
    evidenceUrl?: string
}

/**
 * Registra uma perda/quebra de item de forma voluntária pelo operador.
 */
export async function recordLossAction(data: LossInput) {
    try {
        // SEGURANÇA: Resolver usuário no servidor (Anti-spoofing)
        const authId = await getAuthenticatedUserId()
        if (!authId) throw new Error('Operação não autorizada: Usuário não autenticado.')

        // 1. Inserir registro de perda
        const { data: loss, error: lErr } = await supabase
            .from('inventory_losses')
            .insert([{
                item_id: data.itemId,
                user_id: authId, // Usar ID do servidor
                quantity: data.quantity,
                category: data.category,
                observation: data.observation || null
            }])
            .select()
            .single()

        if (lErr) throw lErr

        // 2. Recompensar honestidade (Gamificação)
        // Usamos import dinâmico para evitar dependência circular se houver
        const { recordPointsAction } = await import('./gamificationAction')
        await recordPointsAction(
            authId, // Usar ID do servidor
            'loss_report' as any,
            loss.id,
            10,
            `Relato de perda: ${data.category}`
        )

        revalidatePath('/dashboard')
        console.log(`[ACTION] Loss registered | Item: ${data.itemId} | User: ${authId} | Qty: ${data.quantity}`)
        return { 
            success: true, 
            rewards: { 
                points: 10, 
                label: 'Relato de honestidade'
            } 
        }
    } catch (err: any) {
        console.error(`[AUTH_FAIL] recordLossAction | User: ${data.userId} | Item: ${data.itemId} | Error: ${err.message}`)
        return { success: false, error: err.message }
    }
}

/**
 * Busca itens para o seletor global (Autocomplete).
 * Prioriza itens do grupo indicado, mas retorna todos os ativos.
 */
export async function getGlobalItemsAction(query: string = '', currentGroupId?: string) {
    try {
        let q = supabase
            .from('items')
            .select('id, name, unit, group_id')
            .eq('active', true)
            .ilike('name', `%${query}%`)
            .limit(20)

        const { data, error } = await q

        if (error) throw error

        // Ordenação inteligente: Itens do grupo atual primeiro
        if (currentGroupId && data) {
            data.sort((a, b) => {
                if (a.group_id === currentGroupId && b.group_id !== currentGroupId) return -1
                if (b.group_id === currentGroupId && a.group_id !== currentGroupId) return 1
                return a.name.localeCompare(b.name)
            })
        }

        return { success: true, data }
    } catch (err: any) {
        return { success: false, error: err.message, data: [] }
    }
}
