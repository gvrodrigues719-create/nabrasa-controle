'use server'

import { getAdminSupabase } from '@/lib/supabase/admin'
import { getServerAuthContext } from '@/lib/server-auth-context'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ProductionLogStatus = 'active' | 'canceled'

export const LOSS_REASONS = [
    'Limpeza / aparas',
    'Porcionamento',
    'Quebra / erro de preparo',
    'Queima',
    'Queda / contaminação',
    'Sobra sem aproveitamento',
    'Validade / descarte',
    'Ajuste de rendimento',
    'Outro',
] as const

export type LossReason = typeof LOSS_REASONS[number]

export interface ProductionLog {
    id: string
    // Produto produzido
    produced_at: string
    produced_time: string | null
    product_name: string
    purchase_item_id: string | null
    quantity: number
    unit: string
    responsible: string
    notes: string | null
    // Insumo usado
    input_item_name: string | null
    input_purchase_item_id: string | null
    input_quantity: number | null
    input_unit: string | null
    // Perda
    loss_quantity: number | null
    loss_unit: string | null
    loss_reason: string | null
    loss_notes: string | null
    // Status / auditoria
    status: ProductionLogStatus
    canceled_at: string | null
    canceled_by: string | null
    cancel_reason: string | null
    created_by: string | null
    created_at: string
    updated_at: string
}

export interface ItemSuggestion {
    id: string
    name: string
    unit: string
    category: string | null
    item_type: string | null
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

    if (!isKitchen) {
        throw new Error('Acesso negado. Apenas a equipe da Cozinha Central pode acessar este módulo.')
    }

    return { supabase, user }
}

// ─────────────────────────────────────────────────────────────────────────────
// READ — Nome do usuário logado (auto-preencher Responsável)
// ─────────────────────────────────────────────────────────────────────────────

export async function getCurrentUserDisplayAction(): Promise<{
    success: boolean
    data?: { name: string; role: string }
    error?: string
}> {
    try {
        const { user } = await getKitchenUser()
        return { success: true, data: { name: user.name, role: user.role } }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
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
            .order('produced_time', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false })

        if (error) throw error

        return { success: true, data: (data ?? []) as ProductionLog[] }
    } catch (e: any) {
        console.error('[getProductionLogsAction]', e)
        return { success: false, error: e.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE — Registrar produção com insumo e perda opcionais
//
// IMPORTANTE: este action insere APENAS em ck_production_logs.
// NÃO toca em: inventory_balances, count_sessions, count_session_items,
//              recipes, production_orders, purchase_orders.
// ─────────────────────────────────────────────────────────────────────────────

export async function createProductionLogAction(input: {
    // Produto produzido (obrigatório)
    produced_at: string
    produced_time?: string
    product_name: string
    purchase_item_id: string
    quantity: number
    unit: string
    responsible: string
    notes?: string
    // Insumo usado (opcional — mas se parcialmente preenchido, valida o todo)
    input_item_name?: string
    input_purchase_item_id?: string
    input_quantity?: number
    input_unit?: string
    // Perda (opcional — obrigatório se loss_quantity > 0)
    loss_quantity?: number
    loss_unit?: string
    loss_reason?: string
    loss_notes?: string
}): Promise<{ success: boolean; data?: ProductionLog; error?: string }> {
    try {
        const { supabase, user } = await getKitchenUser()

        // ── Validar produto produzido ───────────────────────────────────────
        if (!input.purchase_item_id?.trim()) {
            throw new Error('Selecione um produto do catálogo. Produtos sem cadastro não podem ser registrados.')
        }
        if (!input.product_name?.trim()) throw new Error('Nome do produto é obrigatório.')
        if (!input.quantity || isNaN(input.quantity) || input.quantity <= 0) {
            throw new Error('Quantidade produzida deve ser maior que zero.')
        }
        if (!input.unit?.trim()) throw new Error('Unidade do produto é obrigatória.')
        if (!input.responsible?.trim()) throw new Error('Responsável é obrigatório.')

        // Confirmar item_type = 'produced' no banco
        const { data: catalogItem, error: catalogErr } = await supabase
            .from('purchase_items')
            .select('id, name, item_type, is_active')
            .eq('id', input.purchase_item_id)
            .single()

        if (catalogErr || !catalogItem) throw new Error('Produto não encontrado no catálogo.')
        if (!catalogItem.is_active) throw new Error('Produto inativo no catálogo.')
        if (catalogItem.item_type !== 'produced') {
            throw new Error(
                `"${catalogItem.name}" não está classificado como produzido ` +
                `(item_type=${catalogItem.item_type}). Contate o administrador.`
            )
        }

        // ── Validar insumo (se parcialmente preenchido) ────────────────────
        const hasInputQty = input.input_quantity != null && input.input_quantity > 0
        const hasInputName = !!input.input_item_name?.trim()
        const hasInputUnit = !!input.input_unit?.trim()

        if (hasInputQty || hasInputName) {
            if (!hasInputName) throw new Error('Informe o nome do insumo usado.')
            if (!hasInputQty) throw new Error('Informe a quantidade do insumo usado (maior que zero).')
            if (!hasInputUnit) throw new Error('Informe a unidade do insumo usado.')
        }

        // ── Validar perda ──────────────────────────────────────────────────
        const lossQty = input.loss_quantity ?? 0
        const hasLoss = lossQty > 0

        if (hasLoss) {
            if (!hasInputName || !hasInputQty) {
                throw new Error('Para registrar perda, preencha também o insumo usado e sua quantidade.')
            }
            if (!input.loss_unit?.trim()) throw new Error('Unidade da perda é obrigatória.')
            if (!input.loss_reason?.trim()) throw new Error('Motivo da perda é obrigatório.')
            if (input.loss_reason === 'Outro' && !input.loss_notes?.trim()) {
                throw new Error('Descreva o motivo da perda em Observações quando selecionar "Outro".')
            }

            // Se mesma unidade: perda não pode exceder insumo
            const inputQty = input.input_quantity ?? 0
            if (
                input.loss_unit?.toUpperCase() === input.input_unit?.toUpperCase() &&
                lossQty > inputQty
            ) {
                throw new Error(
                    `Perda (${lossQty} ${input.loss_unit}) não pode ser maior que o insumo usado (${inputQty} ${input.input_unit}).`
                )
            }
        }

        // ── Inserir APENAS em ck_production_logs ───────────────────────────
        const { data, error } = await supabase
            .from('ck_production_logs')
            .insert({
                produced_at:          input.produced_at,
                produced_time:        input.produced_time || null,
                product_name:         catalogItem.name,
                purchase_item_id:     input.purchase_item_id,
                quantity:             input.quantity,
                unit:                 input.unit.trim().toUpperCase(),
                responsible:          input.responsible.trim(),
                notes:                input.notes?.trim() || null,
                // Insumo
                input_item_name:      hasInputName ? input.input_item_name!.trim() : null,
                input_purchase_item_id: input.input_purchase_item_id || null,
                input_quantity:       hasInputQty ? input.input_quantity : null,
                input_unit:           hasInputUnit ? input.input_unit!.trim().toUpperCase() : null,
                // Perda
                loss_quantity:        hasLoss ? lossQty : null,
                loss_unit:            hasLoss ? input.loss_unit!.trim().toUpperCase() : null,
                loss_reason:          hasLoss ? input.loss_reason!.trim() : null,
                loss_notes:           hasLoss && input.loss_notes?.trim() ? input.loss_notes.trim() : null,
                // Auditoria
                status:               'active',
                created_by:           user.id,
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
// CANCEL — Cancelar com motivo (não deleta)
// ─────────────────────────────────────────────────────────────────────────────

export async function cancelProductionLogAction(
    id: string,
    cancelReason: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, user } = await getKitchenUser()

        if (!cancelReason?.trim()) throw new Error('Motivo do cancelamento é obrigatório.')

        const { data: existing, error: fetchErr } = await supabase
            .from('ck_production_logs')
            .select('id, status, produced_at')
            .eq('id', id)
            .single()

        if (fetchErr || !existing) throw new Error('Registro não encontrado.')
        if (existing.status === 'canceled') throw new Error('Registro já foi cancelado.')

        if (user.role !== 'admin') {
            const today = new Date().toISOString().split('T')[0]
            if (existing.produced_at !== today) {
                throw new Error('Registros de dias anteriores só podem ser cancelados por um administrador.')
            }
        }

        const { error } = await supabase
            .from('ck_production_logs')
            .update({
                status:      'canceled',
                canceled_at: new Date().toISOString(),
                canceled_by: user.id,
                cancel_reason: cancelReason.trim(),
            })
            .eq('id', id)

        if (error) throw error

        return { success: true }
    } catch (e: any) {
        console.error('[cancelProductionLogAction]', e)
        return { success: false, error: e.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTOCOMPLETE — Produto produzido (item_type = 'produced' APENAS)
// ─────────────────────────────────────────────────────────────────────────────

export async function searchProducedItemsAction(q: string): Promise<{
    success: boolean
    data?: ItemSuggestion[]
    error?: string
}> {
    try {
        const { supabase } = await getKitchenUser()
        const term = q.trim()
        if (!term) return { success: true, data: [] }

        const { data, error } = await supabase
            .from('purchase_items')
            .select('id, name, order_unit, category, item_type')
            .eq('item_type', 'produced')
            .eq('is_active', true)
            .ilike('name', `%${term}%`)
            .order('name')
            .limit(20)

        if (error) throw error

        return {
            success: true,
            data: (data ?? []).map(i => ({
                id: i.id,
                name: i.name,
                unit: i.order_unit || 'UN',
                category: i.category ?? null,
                item_type: i.item_type ?? null,
            })),
        }
    } catch (e: any) {
        console.error('[searchProducedItemsAction]', e)
        return { success: false, error: e.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTOCOMPLETE — Insumo usado (busca ampla, exclui categorias de limpeza/descartáveis)
// Diferente do produto produzido: aceita matéria-prima, mesmo que não seja 'produced'
// ─────────────────────────────────────────────────────────────────────────────

const EXCLUDED_INPUT_CATEGORIES = [
    'LIMPEZA', 'DESCARTÁVEIS', 'DESCARTAVEIS', 'EMBALAGEM', 'EMBALAGENS',
]

export async function searchInputItemsAction(q: string): Promise<{
    success: boolean
    data?: ItemSuggestion[]
    error?: string
}> {
    try {
        const { supabase } = await getKitchenUser()
        const term = q.trim()
        if (!term) return { success: true, data: [] }

        const { data, error } = await supabase
            .from('purchase_items')
            .select('id, name, order_unit, category, item_type')
            .eq('is_active', true)
            .ilike('name', `%${term}%`)
            .order('name')
            .limit(30)

        if (error) throw error

        // Filtrar categorias de limpeza/descartáveis server-side
        const filtered = (data ?? []).filter(i => {
            const cat = (i.category ?? '').toUpperCase()
            return !EXCLUDED_INPUT_CATEGORIES.includes(cat)
        })

        return {
            success: true,
            data: filtered.slice(0, 20).map(i => ({
                id: i.id,
                name: i.name,
                unit: i.order_unit || 'UN',
                category: i.category ?? null,
                item_type: i.item_type ?? null,
            })),
        }
    } catch (e: any) {
        console.error('[searchInputItemsAction]', e)
        return { success: false, error: e.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// READ — Resumo do dia para card da Home CK
// ─────────────────────────────────────────────────────────────────────────────

export async function getProductionSummaryAction(date: string): Promise<{
    success: boolean
    data?: {
        activeCount: number
        canceledCount: number
        lossCount: number
        lastTime: string | null
    }
    error?: string
}> {
    try {
        const { supabase } = await getKitchenUser()

        const { data, error } = await supabase
            .from('ck_production_logs')
            .select('status, produced_time, loss_quantity')
            .eq('produced_at', date)

        if (error) throw error

        const rows = data ?? []
        const activeRows = rows.filter(r => r.status === 'active')
        const canceledCount = rows.filter(r => r.status === 'canceled').length
        const lossCount = activeRows.filter(r => r.loss_quantity != null && Number(r.loss_quantity) > 0).length

        const times = activeRows.map(r => r.produced_time).filter(Boolean) as string[]
        const lastTime = times.length > 0 ? times.sort().reverse()[0].slice(0, 5) : null

        return {
            success: true,
            data: { activeCount: activeRows.length, canceledCount, lossCount, lastTime },
        }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
