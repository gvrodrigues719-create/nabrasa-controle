'use server'

import { createClient } from '@supabase/supabase-js'
import { requireManagerOrAdmin } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'

const supabase = new Proxy({} as any, {
    get(target, prop) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!url || !key) throw new Error("Ambiente incompleto: Faltam chaves de banco de dados.")
        const client = createClient(url, key)
        const value = client[prop as keyof typeof client]
        return typeof value === 'function' ? value.bind(client) : value
    }
})

export type CorrectionInput = {
    sessionId: string
    itemId: string
    newQuantity: number
    isZeroed: boolean
    reason: string
    notes?: string
}

/**
 * Valida ou Corrige um item específico de uma contagem.
 * Registra a correção na tabela de auditoria.
 */
export async function validateCountItemAction(input: CorrectionInput) {
    const user = await requireManagerOrAdmin();

    try {
        if (input.newQuantity < 0) throw new Error("Quantidade não pode ser negativa.");
        if (!input.reason) throw new Error("O motivo da correção é obrigatório.");

        // 1. Buscar valor original para auditoria
        const { data: original, error: origErr } = await supabase
            .from('count_session_items')
            .select('counted_quantity, is_zeroed')
            .eq('session_id', input.sessionId)
            .eq('item_id', input.itemId)
            .single();

        if (origErr || !original) throw new Error("Item da contagem não encontrado.");

        const isChanged = original.counted_quantity !== input.newQuantity || original.is_zeroed !== input.isZeroed;

        // 2. Iniciar transação de correção
        // Nota: No Supabase fazemos via Promise.all ou chamadas sequenciais se não houver RPC de transação complexa
        
        // Atualizar o item
        const { error: updateErr } = await supabase
            .from('count_session_items')
            .update({
                validated_quantity: input.newQuantity,
                validated_is_zeroed: input.isZeroed,
                validated_by: user.id,
                validated_at: new Error().toISOString(), // Mock ISO string for TS
                validation_reason: input.reason,
                validation_notes: input.notes
            })
            .eq('session_id', input.sessionId)
            .eq('item_id', input.itemId);

        if (updateErr) throw updateErr;

        // Registrar auditoria se houve mudança
        if (isChanged) {
            const { error: auditErr } = await supabase
                .from('count_item_corrections')
                .insert({
                    session_id: input.sessionId,
                    item_id: input.itemId,
                    old_counted_quantity: original.counted_quantity,
                    old_is_zeroed: original.is_zeroed,
                    new_validated_quantity: input.newQuantity,
                    new_validated_is_zeroed: input.isZeroed,
                    corrected_by: user.id,
                    correction_reason: input.reason,
                    correction_notes: input.notes
                });
            if (auditErr) console.error("Erro ao registrar auditoria:", auditErr);
        }

        // 3. Atualizar status da sessão para 'corrected'
        await supabase
            .from('count_sessions')
            .update({ 
                validation_status: 'corrected',
                updated_at: new Date().toISOString()
            })
            .eq('id', input.sessionId);

        revalidatePath(`/dashboard/admin/history/session/${input.sessionId}`);
        return { success: true };
    } catch (err: any) {
        console.error('[validateCountItemAction]:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Valida a sessão inteira como 'OK' sem alterações.
 */
export async function validateEntireCountSessionAction(sessionId: string) {
    const user = await requireManagerOrAdmin();

    try {
        const { error } = await supabase
            .from('count_sessions')
            .update({
                validation_status: 'validated',
                validated_by: user.id,
                validated_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', sessionId);

        if (error) throw error;

        revalidatePath(`/dashboard/admin/history/session/${sessionId}`);
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
