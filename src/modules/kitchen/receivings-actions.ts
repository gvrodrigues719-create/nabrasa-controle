'use server'

import { getAdminSupabase } from '@/lib/supabase/admin'
import { getServerAuthContext } from '@/lib/server-auth-context'
import type {
    CKReceiving,
    CKReceivingItem,
    ReceivingStatus,
} from './receivings-types'

async function getCurrentUser() {
    const supabase = getAdminSupabase()
    const user = await getServerAuthContext()
    const isKitchen = user.role === 'admin' || user.role === 'kitchen' || user.groups?.macro_sector === 'Cozinha Central'
    
    // Normalize role for internal logic if needed, but the check should use isKitchen
    const normalizedUser = { ...user, role: isKitchen ? 'kitchen' : user.role }
    if (user.role === 'admin') normalizedUser.role = 'admin'

    return { supabase, user: normalizedUser, isKitchen }
}

// ─────────────────────────────────────────────────────────────────────────────
// READ — Buscar entregas de uma semana e atrasadas
// ─────────────────────────────────────────────────────────────────────────────

export async function getWeeklyReceivingsAction(weekStart: string, weekEnd: string): Promise<{
    success: boolean
    data?: { receivings: CKReceiving[]; overdue: CKReceiving[] }
    error?: string
}> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'kitchen'].includes(user.role)) throw new Error('Sem permissão')

        // Entregas da semana
        const { data: weekData, error: weekErr } = await supabase
            .from('ck_receivings')
            .select(`
                *,
                ck_receiving_items (*),
                ck_suppliers:supplier_id (id, name, normalized_name)
            `)
            .gte('delivery_date', weekStart)
            .lte('delivery_date', weekEnd)
            .order('delivery_date', { ascending: true })

        if (weekErr) throw weekErr

        // Entregas atrasadas (agendadas mas com data anterior ao início da semana)
        const today = new Date().toISOString().split('T')[0]
        const { data: overdueData, error: overdueErr } = await supabase
            .from('ck_receivings')
            .select(`
                *,
                ck_receiving_items (*),
                ck_suppliers:supplier_id (id, name, normalized_name)
            `)
            .lt('delivery_date', weekStart <= today ? weekStart : today)
            .in('status', ['scheduled'])
            .order('delivery_date', { ascending: true })

        if (overdueErr) throw overdueErr

        const toReceiving = (r: any): CKReceiving => ({
            ...r,
            supplier_name: r.ck_suppliers?.name || r.supplier_name,
            items: r.ck_receiving_items || [],
            is_overdue: r.status === 'scheduled' && r.delivery_date < today,
        })

        return {
            success: true,
            data: {
                receivings: (weekData || []).map(toReceiving),
                overdue: (overdueData || []).map(toReceiving),
            }
        }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE — Criar novo recebimento
// ─────────────────────────────────────────────────────────────────────────────

export async function createReceivingAction(input: {
    title: string
    supplier_name?: string
    supplier_id?: string
    delivery_date: string
    delivery_period?: string
    delivery_time?: string
    priority?: string
    notes?: string
    items?: {
        item_name: string
        purchase_item_id?: string
        receiving_catalog_item_id?: string
        catalog_item_id?: string
        supplier_id?: string
        expected_qty?: number
        expected_unit_price?: number
        expected_total?: number
        unit?: string
        item_name_snapshot?: string
        unit_snapshot?: string
    }[]
}): Promise<{ success: boolean; data?: CKReceiving; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'kitchen'].includes(user.role)) throw new Error('Sem permissão para criar recebimentos')

        // Criar cabeçalho
        const { data: receiving, error: createErr } = await supabase
            .from('ck_receivings')
            .insert({
                title: input.title,
                supplier_name: input.supplier_name || null,
                supplier_id: input.supplier_id || null,
                delivery_date: input.delivery_date,
                delivery_period: input.delivery_period || null,
                delivery_time: input.delivery_time || null,
                priority: input.priority || 'normal',
                notes: input.notes || null,
                status: 'scheduled',
                created_by: user.id,
            })
            .select()
            .single()

        if (createErr) throw createErr

        // Criar itens (se houver)
        if (input.items && input.items.length > 0) {
            const { error: itemsErr } = await supabase
                .from('ck_receiving_items')
                .insert(
                    input.items.map(item => ({
                        receiving_id: receiving.id,
                        item_name: item.item_name,
                        purchase_item_id: item.purchase_item_id || null,
                        receiving_catalog_item_id: item.receiving_catalog_item_id || null,
                        catalog_item_id: item.catalog_item_id || null,
                        supplier_id: item.supplier_id || input.supplier_id || null,
                        expected_qty: item.expected_qty || null,
                        expected_unit_price: item.expected_unit_price || null,
                        expected_total: item.expected_total || null,
                        unit: item.unit || null,
                        item_name_snapshot: item.item_name_snapshot || item.item_name || null,
                        unit_snapshot: item.unit_snapshot || item.unit || null,
                        item_status: 'pending',
                    }))
                )
            if (itemsErr) throw itemsErr
        }

        // Criar evento de auditoria
        await supabase.from('ck_receiving_events').insert({
            receiving_id: receiving.id,
            user_id: user.id,
            event_type: 'created',
            payload: { title: input.title, delivery_date: input.delivery_date },
        })

        return { success: true, data: receiving }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION — Marcar como Recebido
// ─────────────────────────────────────────────────────────────────────────────

export async function markReceivingDeliveredAction(
    receivingId: string,
    receptionNotes?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'kitchen'].includes(user.role)) throw new Error('Sem permissão')

        // Validar status atual
        const { data: current, error: currentErr } = await supabase
            .from('ck_receivings')
            .select('status')
            .eq('id', receivingId)
            .single()
            
        if (currentErr) throw currentErr
        if (current.status !== 'scheduled' && current.status !== 'partial') {
            throw new Error(`Não é possível marcar como recebido uma entrega com status ${current.status}`)
        }

        const { error } = await supabase
            .from('ck_receivings')
            .update({
                status: 'delivered',
                received_by: user.id,
                received_at: new Date().toISOString(),
                reception_notes: receptionNotes || null,
            })
            .eq('id', receivingId)

        if (error) throw error

        // Marcar todos os itens como recebidos
        await supabase
            .from('ck_receiving_items')
            .update({ item_status: 'received' })
            .eq('receiving_id', receivingId)
            .eq('item_status', 'pending')

        await supabase.from('ck_receiving_events').insert({
            receiving_id: receivingId,
            user_id: user.id,
            event_type: 'marked_delivered',
            payload: { reception_notes: receptionNotes },
        })

        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION — Marcar como Parcial
// ─────────────────────────────────────────────────────────────────────────────

export async function markReceivingPartialAction(
    receivingId: string,
    receptionNotes: string,
    itemUpdates?: {
        itemId: string
        item_status: 'received' | 'partial' | 'not_delivered' | 'refused'
        received_qty?: number
        notes?: string
    }[]
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'kitchen'].includes(user.role)) throw new Error('Sem permissão')
        if (!receptionNotes?.trim()) throw new Error('Motivo/observação é obrigatório para recebimento parcial')

        // Validar status atual
        const { data: current, error: currentErr } = await supabase
            .from('ck_receivings')
            .select('status')
            .eq('id', receivingId)
            .single()
            
        if (currentErr) throw currentErr
        if (current.status !== 'scheduled' && current.status !== 'partial') {
            throw new Error(`Não é possível marcar como parcial uma entrega com status ${current.status}`)
        }

        const { error } = await supabase
            .from('ck_receivings')
            .update({
                status: 'partial',
                received_by: user.id,
                received_at: new Date().toISOString(),
                reception_notes: receptionNotes,
            })
            .eq('id', receivingId)

        if (error) throw error

        // Atualizar itens individualmente
        if (itemUpdates && itemUpdates.length > 0) {
            for (const upd of itemUpdates) {
                await supabase
                    .from('ck_receiving_items')
                    .update({
                        item_status: upd.item_status,
                        received_qty: upd.received_qty ?? null,
                        notes: upd.notes ?? null,
                    })
                    .eq('id', upd.itemId)
            }
        }

        await supabase.from('ck_receiving_events').insert({
            receiving_id: receivingId,
            user_id: user.id,
            event_type: 'marked_partial',
            payload: { reception_notes: receptionNotes, item_updates: itemUpdates },
        })

        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION — Marcar como Recusado
// ─────────────────────────────────────────────────────────────────────────────

export async function markReceivingRefusedAction(
    receivingId: string,
    refusalReason: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'kitchen'].includes(user.role)) throw new Error('Sem permissão')
        if (!refusalReason?.trim()) throw new Error('Motivo é obrigatório para recusar entrega')

        // Validar status atual
        const { data: current, error: currentErr } = await supabase
            .from('ck_receivings')
            .select('status')
            .eq('id', receivingId)
            .single()
            
        if (currentErr) throw currentErr
        if (current.status !== 'scheduled' && current.status !== 'partial') {
            throw new Error(`Não é possível recusar uma entrega com status ${current.status}`)
        }

        const { error } = await supabase
            .from('ck_receivings')
            .update({
                status: 'refused',
                received_by: user.id,
                received_at: new Date().toISOString(),
                refusal_reason: refusalReason,
            })
            .eq('id', receivingId)

        if (error) throw error

        await supabase
            .from('ck_receiving_items')
            .update({ item_status: 'refused' })
            .eq('receiving_id', receivingId)
            .eq('item_status', 'pending')

        await supabase.from('ck_receiving_events').insert({
            receiving_id: receivingId,
            user_id: user.id,
            event_type: 'marked_refused',
            payload: { refusal_reason: refusalReason },
        })

        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION — Cancelar (somente admin/manager)
// ─────────────────────────────────────────────────────────────────────────────

export async function cancelReceivingAction(
    receivingId: string,
    cancelReason: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'kitchen'].includes(user.role)) throw new Error('Sem permissão para cancelar')
        if (!cancelReason?.trim()) throw new Error('Motivo de cancelamento é obrigatório')

        // Validar status atual
        const { data: current, error: currentErr } = await supabase
            .from('ck_receivings')
            .select('status')
            .eq('id', receivingId)
            .single()
            
        if (currentErr) throw currentErr
        if (current.status !== 'scheduled') {
            throw new Error(`Não é possível cancelar uma entrega com status ${current.status}`)
        }

        const { error } = await supabase
            .from('ck_receivings')
            .update({
                status: 'canceled',
                canceled_by: user.id,
                canceled_at: new Date().toISOString(),
            })
            .eq('id', receivingId)

        if (error) throw error

        await supabase.from('ck_receiving_events').insert({
            receiving_id: receivingId,
            user_id: user.id,
            event_type: 'canceled',
            payload: { cancel_reason: cancelReason }
        })

        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION — Editar Entrega (somente admin/kitchen, somente scheduled/partial)
// ─────────────────────────────────────────────────────────────────────────────

export async function updateReceivingAction(
    receivingId: string,
    input: {
        title?: string
        supplier_name?: string
        supplier_id?: string
        delivery_date?: string
        delivery_period?: string
        delivery_time?: string
        priority?: string
        notes?: string
        items?: {
            id?: string // Se existir, atualiza; senão, cria.
            item_name: string
            purchase_item_id?: string
            receiving_catalog_item_id?: string
            catalog_item_id?: string
            supplier_id?: string
            expected_qty?: number
            expected_unit_price?: number
            expected_total?: number
            unit?: string
            item_name_snapshot?: string
            unit_snapshot?: string
        }[]
    }
): Promise<{ success: boolean; data?: CKReceiving; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'kitchen'].includes(user.role)) throw new Error('Sem permissão para editar recebimentos')

        // Validar status atual
        const { data: current, error: currentErr } = await supabase
            .from('ck_receivings')
            .select('status')
            .eq('id', receivingId)
            .single()
            
        if (currentErr) throw currentErr
        if (!['scheduled', 'partial'].includes(current.status)) {
            throw new Error(`Não é possível editar uma entrega com status ${current.status}`)
        }

        // 1. Atualizar cabeçalho
        const updates: any = {}
        if (input.title !== undefined) updates.title = input.title
        if (input.supplier_name !== undefined) updates.supplier_name = input.supplier_name || null
        if (input.supplier_id !== undefined) updates.supplier_id = input.supplier_id || null
        if (input.delivery_date !== undefined) updates.delivery_date = input.delivery_date
        if (input.delivery_period !== undefined) updates.delivery_period = input.delivery_period || null
        if (input.delivery_time !== undefined) updates.delivery_time = input.delivery_time || null
        if (input.priority !== undefined) updates.priority = input.priority
        if (input.notes !== undefined) updates.notes = input.notes || null

        if (Object.keys(updates).length > 0) {
            const { error: updateErr } = await supabase
                .from('ck_receivings')
                .update(updates)
                .eq('id', receivingId)
            if (updateErr) throw updateErr
        }

        // 2. Sincronizar itens (se enviado no input)
        if (input.items !== undefined) {
            const { data: currentItems, error: itemsErr } = await supabase
                .from('ck_receiving_items')
                .select('id, item_status')
                .eq('receiving_id', receivingId)
            if (itemsErr) throw itemsErr

            const currentMap = new Map(currentItems.map(i => [i.id, i]))
            const inputIds = new Set(input.items.filter(i => i.id).map(i => i.id))

            for (const cItem of currentItems) {
                if (!inputIds.has(cItem.id)) {
                    if (['pending', 'not_delivered'].includes(cItem.item_status)) {
                        await supabase.from('ck_receiving_items').delete().eq('id', cItem.id)
                    } else {
                        throw new Error('Não é possível remover um item que já teve recebimento registrado.')
                    }
                }
            }

            for (const item of input.items) {
                if (item.id && currentMap.has(item.id)) {
                    // Update
                    await supabase.from('ck_receiving_items').update({
                        item_name: item.item_name,
                        expected_qty: item.expected_qty || null,
                        expected_unit_price: item.expected_unit_price || null,
                        expected_total: item.expected_total || null,
                        unit: item.unit || null,
                        item_name_snapshot: item.item_name_snapshot || item.item_name || null,
                        unit_snapshot: item.unit_snapshot || item.unit || null,
                        purchase_item_id: item.purchase_item_id || null,
                        receiving_catalog_item_id: item.receiving_catalog_item_id || null,
                        catalog_item_id: item.catalog_item_id || null,
                        supplier_id: item.supplier_id || input.supplier_id || null,
                    }).eq('id', item.id)
                } else {
                    // Insert
                    await supabase.from('ck_receiving_items').insert({
                        receiving_id: receivingId,
                        item_name: item.item_name,
                        expected_qty: item.expected_qty || null,
                        expected_unit_price: item.expected_unit_price || null,
                        expected_total: item.expected_total || null,
                        unit: item.unit || null,
                        item_name_snapshot: item.item_name_snapshot || item.item_name || null,
                        unit_snapshot: item.unit_snapshot || item.unit || null,
                        purchase_item_id: item.purchase_item_id || null,
                        receiving_catalog_item_id: item.receiving_catalog_item_id || null,
                        catalog_item_id: item.catalog_item_id || null,
                        supplier_id: item.supplier_id || input.supplier_id || null,
                        item_status: 'pending'
                    })
                }
            }
        }

        // 3. Registrar auditoria
        await supabase.from('ck_receiving_events').insert({
            receiving_id: receivingId,
            user_id: user.id,
            event_type: 'updated',
            payload: { fields_changed: Object.keys(updates), has_item_updates: input.items !== undefined },
        })

        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// READ — Buscar itens do catálogo para autocomplete
// ─────────────────────────────────────────────────────────────────────────────

export async function searchPurchaseItemsAction(q: string, supplierId?: string): Promise<{
    success: boolean
    data?: { id: string; name: string; order_unit: string; category?: string; supplier_id?: string; expected_unit_price?: number; expected_total?: number; source: 'catalog' | 'purchase' | 'ck_purchase' }[]
    error?: string
}> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'kitchen'].includes(user.role)) throw new Error('Sem permissão')

        const term = q.trim()

        // 1. Busca no NOVO catálogo de compras CK
        let newCatQuery = supabase
            .from('ck_purchase_catalog_items')
            .select('id, fiscal_item_name, unit, category, last_unit_price, last_total_price, supplier_id')
            .ilike('fiscal_item_name', `%${term}%`)
            .eq('active', true)
            .order('fiscal_item_name')
            .limit(15)

        if (supplierId) {
            newCatQuery = newCatQuery.eq('supplier_id', supplierId)
        }
        const { data: newCatData } = await newCatQuery

        // 2. Busca no catálogo antigo de insumos de recebimento (fallback)
        const { data: catalogData } = await supabase
            .from('ck_receiving_catalog_items')
            .select('id, name, unit, category')
            .ilike('name', `%${term}%`)
            .eq('is_active', true)
            .order('name')
            .limit(10)

        // 3. Busca no purchase_items (catálogo geral)
        const { data: purchaseData } = await supabase
            .from('purchase_items')
            .select('id, name, order_unit, category')
            .ilike('name', `%${term}%`)
            .eq('is_active', true)
            .order('name')
            .limit(10)

        const newCatResults = (newCatData || []).map(r => ({
            id: r.id,
            name: r.fiscal_item_name,
            order_unit: r.unit || 'UN',
            category: r.category,
            supplier_id: r.supplier_id,
            expected_unit_price: r.last_unit_price,
            expected_total: r.last_total_price,
            source: 'ck_purchase' as const,
        }))

        const catalogResults = (catalogData || []).map(r => ({
            id: r.id,
            name: r.name,
            order_unit: r.unit || 'UN',
            category: r.category,
            source: 'catalog' as const,
        }))

        const purchaseResults = (purchaseData || []).map(r => ({
            id: r.id,
            name: r.name,
            order_unit: r.order_unit || 'UN',
            category: r.category,
            source: 'purchase' as const,
        }))

        // NOVO catálogo primeiro, depois os antigos
        const ckNames = new Set(newCatResults.map(r => r.name.toLowerCase()))
        const merged = [
            ...newCatResults,
            ...catalogResults.filter(r => !ckNames.has(r.name.toLowerCase())),
        ]

        const currentNames = new Set(merged.map(r => r.name.toLowerCase()))
        const finalMerged = [
            ...merged,
            ...purchaseResults.filter(r => !currentNames.has(r.name.toLowerCase())),
        ].slice(0, 20)

        return { success: true, data: finalMerged }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALOG — Listar insumos do catálogo de recebimentos
// ─────────────────────────────────────────────────────────────────────────────

export async function getCatalogItemsAction(opts?: { search?: string; category?: string; active?: boolean }): Promise<{
    success: boolean
    data?: any[]
    error?: string
}> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'kitchen'].includes(user.role)) throw new Error('Sem permissão')

        let q = supabase
            .from('ck_receiving_catalog_items')
            .select('*')
            .order('name')

        if (opts?.search) q = q.ilike('name', `%${opts.search}%`)
        if (opts?.category) q = q.eq('category', opts.category)
        if (opts?.active !== undefined) q = q.eq('is_active', opts.active)

        const { data, error } = await q
        if (error) throw error
        return { success: true, data: data || [] }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALOG — Criar insumo
// ─────────────────────────────────────────────────────────────────────────────

export async function createCatalogItemAction(input: {
    name: string
    unit: string
    category?: string
    notes?: string
}): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'kitchen'].includes(user.role)) throw new Error('Sem permissão para cadastrar insumos')
        if (!input.name?.trim()) throw new Error('Nome é obrigatório')
        if (!input.unit?.trim()) throw new Error('Unidade é obrigatória')

        const name = input.name.trim().toUpperCase()
        const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

        const { data, error } = await supabase
            .from('ck_receiving_catalog_items')
            .insert({
                name,
                normalized_name: normalized,
                unit: input.unit.trim().toUpperCase(),
                category: input.category || null,
                notes: input.notes || null,
                is_active: true,
                created_by: user.id,
            })
            .select()
            .single()

        if (error) throw error
        return { success: true, data }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALOG — Editar insumo
// ─────────────────────────────────────────────────────────────────────────────

export async function updateCatalogItemAction(id: string, input: {
    name?: string
    unit?: string
    category?: string
    notes?: string
    is_active?: boolean
}): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, user } = await getCurrentUser()
        if (!['admin', 'kitchen'].includes(user.role)) throw new Error('Sem permissão')

        const updates: any = { updated_by: user.id }
        if (input.name !== undefined) {
            updates.name = input.name.trim().toUpperCase()
            updates.normalized_name = updates.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        }
        if (input.unit !== undefined) updates.unit = input.unit.trim().toUpperCase()
        if (input.category !== undefined) updates.category = input.category || null
        if (input.notes !== undefined) updates.notes = input.notes || null
        if (input.is_active !== undefined) updates.is_active = input.is_active

        const { error } = await supabase
            .from('ck_receiving_catalog_items')
            .update(updates)
            .eq('id', id)

        if (error) throw error
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
