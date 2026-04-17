'use server'

import { createClient } from '@supabase/supabase-js'
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
}

/**
 * Registra uma perda/quebra de item de forma voluntária pelo operador.
 */
export async function recordLossAction(data: LossInput) {
    try {
        // 1. Inserir registro de perda
        const { data: loss, error: lErr } = await supabase
            .from('inventory_losses')
            .insert([{
                item_id: data.itemId,
                user_id: data.userId,
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
            data.userId,
            'loss_report' as any, // Cast para aceitar novo tipo
            loss.id,
            10, // 10 pontos por relatar erro proativamente
            `Relato de perda: ${data.category}`
        )

        revalidatePath('/dashboard')
        return { success: true }
    } catch (err: any) {
        console.error('[LossAction] Erro ao registrar perda:', err.message)
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
