'use server'

import { createClient } from '@supabase/supabase-js'
import { requireManagerOrAdmin } from '@/lib/auth-utils'

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

export type ConsolidatedSuggestionItem = {
    purchase_item_id: string
    purchase_item_name: string | null
    unit: string | null
    consolidated_counted_qty: number
    min_stock: number
    max_stock: number
    suggested_qty: number
    status: 'Comprar' | 'Suficiente' | 'Sem vínculo' | 'Sem estoque ideal' | 'Revisar'
    motivo: string
    origins: string[] // Nomes dos grupos de onde veio o estoque
    is_corrected: boolean
}

export async function getConsolidatedPurchaseSuggestionAction(sessionIds: string[]) {
    await requireManagerOrAdmin();

    try {
        if (!sessionIds || sessionIds.length === 0) throw new Error("Nenhuma sessão selecionada.");

        // 1. Carregar sessões e validar unidade
        const { data: sessions, error: sessErr } = await supabase
            .from('count_sessions')
            .select(`
                id, 
                group_id, 
                user_id,
                groups(name),
                users!user_id(unit_id)
            `)
            .in('id', sessionIds);

        if (sessErr || !sessions) throw sessErr || new Error("Erro ao carregar sessões.");

        const storeId = (sessions[0]?.users as any)?.unit_id;
        if (!storeId) throw new Error("Não foi possível identificar a unidade da primeira sessão.");

        // Validar se todas são da mesma unidade
        const divergentStore = sessions.find((s: any) => (s.users as any)?.unit_id !== storeId);
        if (divergentStore) throw new Error("Todas as sessões selecionadas devem pertencer à mesma unidade.");

        // 2. Carregar TODOS os itens das sessões selecionadas
        const { data: countItems, error: itemsErr } = await supabase
            .from('count_session_items')
            .select(`
                item_id, 
                counted_quantity, 
                is_zeroed, 
                validated_quantity, 
                validated_is_zeroed,
                session_id,
                items!inner(name, unit)
            `)
            .in('session_id', sessionIds);

        if (itemsErr || !countItems) throw itemsErr || new Error("Erro ao carregar itens das contagens.");

        // 3. Carregar mapeamentos e parâmetros da loja
        const { data: mappings } = await supabase.from('count_to_purchase_item_map').select('*');
        const mappingMap = new Map(mappings?.map((m: any) => [m.count_item_id, m.purchase_item_id]));

        const { data: pItems } = await supabase.from('purchase_items').select('*').eq('is_active', true);
        const pItemMap = new Map(pItems?.map((p: any) => [p.id, p]));

        const { data: params } = await supabase.from('store_item_parameters').select('*').eq('store_id', storeId);
        const paramsMap = new Map(params?.map((p: any) => [p.purchase_item_id, p]));

        // 4. Consolidar Estoque Atual
        // Agrupar por purchase_item_id. Se não houver vínculo, manter por item_id para reportar "Sem vínculo"
        const consolidation = new Map<string, { 
            purchase_item_id: string | null,
            count_item_name: string,
            total_qty: number,
            origins: Set<string>,
            has_correction: boolean,
            unit: string
        }>();

        for (const ci of countItems) {
            const purchaseId = (mappingMap.get(ci.item_id) || null) as string | null;
            const session = sessions.find((s: any) => s.id === ci.session_id);
            const originName = session?.groups?.name || 'Desconhecido';
            
            // Lógica de quantidade efetiva (Auditoria V1.1)
            const isValidated = ci.validated_quantity !== null && ci.validated_quantity !== undefined;
            const finalIsZeroed = isValidated ? ci.validated_is_zeroed : ci.is_zeroed;
            const qty = finalIsZeroed ? 0 : (isValidated ? ci.validated_quantity : (ci.counted_quantity ?? 0));

            const key = (purchaseId || `unlinked_${ci.item_id}`) as string;
            
            if (!consolidation.has(key)) {
                consolidation.set(key, {
                    purchase_item_id: purchaseId,
                    count_item_name: (ci.items as any)?.name || 'Sem nome',
                    total_qty: qty,
                    origins: new Set([originName]),
                    has_correction: isValidated,
                    unit: (ci.items as any)?.unit || 'un'
                });
            } else {
                const existing = consolidation.get(key)!;
                existing.total_qty += qty;
                existing.origins.add(originName);
                if (isValidated) existing.has_correction = true;
            }
        }

        // 5. Gerar Sugestões Consolidadas
        const results: ConsolidatedSuggestionItem[] = [];

        for (const [key, data] of consolidation.entries()) {
            const pItem = data.purchase_item_id ? pItemMap.get(data.purchase_item_id) : null;
            const param = data.purchase_item_id ? paramsMap.get(data.purchase_item_id) : null;
            
            const min = param?.min_stock ?? 0;
            const max = param?.max_stock ?? 0;
            const stock = data.total_qty;

            let suggested = 0;
            let status: ConsolidatedSuggestionItem['status'] = 'Suficiente';
            let motivo = '';

            if (!data.purchase_item_id) {
                status = 'Sem vínculo';
                motivo = 'Sem vínculo com item de compra';
            } else if (!max) {
                status = 'Sem estoque ideal';
                motivo = 'Sem estoque ideal cadastrado';
            } else {
                // Regra Min/Max Consolidada
                if (min > 0) {
                    if (stock <= min) {
                        suggested = Math.max(0, max - stock);
                        status = 'Comprar';
                        motivo = 'Abaixo do estoque mínimo consolidado';
                    } else {
                        status = 'Suficiente';
                        motivo = 'Estoque consolidado suficiente';
                    }
                } else {
                    // Fallback apenas Max
                    suggested = Math.max(0, max - stock);
                    if (suggested > 0) {
                        status = 'Comprar';
                        motivo = 'Reposição até o estoque alvo';
                    } else {
                        status = 'Suficiente';
                        motivo = 'Estoque dentro do alvo';
                    }
                }
            }

            results.push({
                purchase_item_id: data.purchase_item_id || key,
                purchase_item_name: pItem?.name || data.count_item_name,
                unit: pItem?.order_unit || data.unit,
                consolidated_counted_qty: stock,
                min_stock: min,
                max_stock: max,
                suggested_qty: suggested,
                status: status === 'Suficiente' ? 'Suficiente' : (status as any),
                motivo,
                origins: Array.from(data.origins),
                is_corrected: data.has_correction
            });
        }

        return { 
            success: true, 
            data: results,
            diagnostic: {
                sessionsUsed: sessionIds.length,
                storeId,
                totalItemsConsolidated: results.length
            }
        };

    } catch (err: any) {
        console.error('[getConsolidatedPurchaseSuggestionAction]:', err);
        return { success: false, error: err.message };
    }
}
