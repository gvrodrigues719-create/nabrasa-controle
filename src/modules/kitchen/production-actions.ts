'use server'

import { getAdminSupabase } from '@/lib/supabase/admin'
import { getServerAuthContext } from '@/lib/server-auth-context'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductionLog {
    id: string
    produced_at: string          // DATE 'YYYY-MM-DD'
    produced_time: string | null // TIME 'HH:MM'
    product_name: string
    purchase_item_id: string | null
    quantity: number
    unit: string
    responsible: string
    notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
}

export interface ProducedItemSuggestion {
    id: string
    name: string
    unit: string
    category: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth helper
// ─────────────────────────────────────────────────────────────────────────────

async function getKitchenUser() {
    const supabase = getAdminSupabase()
    const user = await getServerAuthContext()
    const macroSector = (user.groups as any)?.macro_sector
    const isKitchen =
        user.role === 'admin' ||
        user.role === 'kitchen' ||
        macroSector === 'Cozinha Central'

    if (!isKitchen) throw new Error('Sem permissão para acessar o módulo de produção.')

    return { supabase, user }
}

// ─────────────────────────────────────────────────────────────────────────────
// READ — Listar registros de uma data
// ─────────────────────────────────────────────────────────────────────────────

export async function getProductionLogsAction(date: string): Promise<{
    success: boolean
    data?: ProductionLog[]
    error?: string
}> {
    try {
        const { supabase } = await getKitchenUser()

        const { data, error } = await supabase
            .from('ck_production_logs')
            .select('*')
            .eq('produced_at', date)
            .order('produced_time', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: false })

        if (error) throw error

        return { success: true, data: (data ?? []) as ProductionLog[] }
    } catch (e: any) {
        console.error('[getProductionLogsAction]', e)
        return { success: false, error: e.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE — Registrar produção
// ─────────────────────────────────────────────────────────────────────────────

export async function createProductionLogAction(input: {
    produced_at: string
    produced_time?: string
    product_name: string
    purchase_item_id?: string
    quantity: number
    unit: string
    responsible: string
    notes?: string
}): Promise<{ success: boolean; data?: ProductionLog; error?: string }> {
    try {
        const { supabase, user } = await getKitchenUser()

        if (!input.product_name?.trim()) throw new Error('Nome do produto é obrigatório.')
        if (!input.quantity || input.quantity <= 0) throw new Error('Quantidade deve ser maior que zero.')
        if (!input.unit?.trim()) throw new Error('Unidade é obrigatória.')
        if (!input.responsible?.trim()) throw new Error('Responsável é obrigatório.')

        const { data, error } = await supabase
            .from('ck_production_logs')
            .insert({
                produced_at: input.produced_at,
                produced_time: input.produced_time || null,
                product_name: input.product_name.trim().toUpperCase(),
                purchase_item_id: input.purchase_item_id || null,
                quantity: input.quantity,
                unit: input.unit.trim().toUpperCase(),
                responsible: input.responsible.trim(),
                notes: input.notes?.trim() || null,
                created_by: user.id,
            })
            .select()
            .single()

        if (error) throw error

        return { success: true, data: data as ProductionLog }
    } catch (e: any) {
        console.error('[createProductionLogAction]', e)
        return { success: false, error: e.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE — Remover registro (admin pode qualquer, kitchen apenas do próprio dia)
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteProductionLogAction(id: string): Promise<{
    success: boolean
    error?: string
}> {
    try {
        const { supabase, user } = await getKitchenUser()

        // Buscar o registro para validar
        const { data: existing, error: fetchErr } = await supabase
            .from('ck_production_logs')
            .select('id, created_by, produced_at')
            .eq('id', id)
            .single()

        if (fetchErr || !existing) throw new Error('Registro não encontrado.')

        // Admin pode remover qualquer; kitchen apenas do próprio dia
        if (user.role !== 'admin') {
            const today = new Date().toISOString().split('T')[0]
            if (existing.produced_at !== today) {
                throw new Error('Só é possível remover registros do dia atual. Contate o administrador para remover registros anteriores.')
            }
            if (existing.created_by !== user.id) {
                throw new Error('Você só pode remover registros criados por você.')
            }
        }

        const { error } = await supabase
            .from('ck_production_logs')
            .delete()
            .eq('id', id)

        if (error) throw error

        return { success: true }
    } catch (e: any) {
        console.error('[deleteProductionLogAction]', e)
        return { success: false, error: e.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTOCOMPLETE — Buscar itens produzidos no catálogo
// ─────────────────────────────────────────────────────────────────────────────

export async function searchProducedItemsAction(q: string): Promise<{
    success: boolean
    data?: ProducedItemSuggestion[]
    error?: string
}> {
    try {
        const { supabase } = await getKitchenUser()

        const term = q.trim()

        // 1. Busca em purchase_items com item_type = 'produced'
        const { data: producedItems } = await supabase
            .from('purchase_items')
            .select('id, name, order_unit, category')
            .eq('item_type', 'produced')
            .eq('is_active', true)
            .ilike('name', `%${term}%`)
            .order('name')
            .limit(15)

        // 2. Se menos de 5 resultados, complementa com todos os tipos ativos
        let supplementary: any[] = []
        if ((producedItems?.length ?? 0) < 5 && term.length >= 2) {
            const { data: allItems } = await supabase
                .from('purchase_items')
                .select('id, name, order_unit, category')
                .eq('is_active', true)
                .neq('item_type', 'produced') // só os que ainda não vieram
                .ilike('name', `%${term}%`)
                .order('name')
                .limit(10)
            supplementary = allItems ?? []
        }

        const producedNames = new Set((producedItems ?? []).map(i => i.name.toLowerCase()))
        const merged = [
            ...(producedItems ?? []),
            ...supplementary.filter(i => !producedNames.has(i.name.toLowerCase())),
        ].slice(0, 20)

        const result: ProducedItemSuggestion[] = merged.map(i => ({
            id: i.id,
            name: i.name,
            unit: i.order_unit || 'UN',
            category: i.category ?? null,
        }))

        return { success: true, data: result }
    } catch (e: any) {
        console.error('[searchProducedItemsAction]', e)
        return { success: false, error: e.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// READ — Resumo de produção por data (total de itens, quantidade total)
// ─────────────────────────────────────────────────────────────────────────────

export async function getProductionSummaryAction(date: string): Promise<{
    success: boolean
    data?: { totalItems: number; totalQuantity: number }
    error?: string
}> {
    try {
        const { supabase } = await getKitchenUser()

        const { data, error } = await supabase
            .from('ck_production_logs')
            .select('quantity')
            .eq('produced_at', date)

        if (error) throw error

        const rows = data ?? []
        const totalItems = rows.length
        const totalQuantity = rows.reduce((acc, r) => acc + Number(r.quantity), 0)

        return { success: true, data: { totalItems, totalQuantity } }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
