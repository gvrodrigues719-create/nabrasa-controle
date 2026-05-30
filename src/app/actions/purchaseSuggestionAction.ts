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

export type PurchaseSuggestionItem = {
    count_item_id: string
    count_item_name: string
    counted_qty: number
    purchase_item_id?: string
    purchase_item_name?: string
    min_stock: number
    max_stock: number
    suggested_qty: number
    status: 'Comprar' | 'Não precisa comprar' | 'Sem estoque ideal' | 'Sem vínculo' | 'Revisar'
    motivo: string
    unit?: string
    mapping_type: 'manual' | 'auto' | 'none'
}

/**
 * Normaliza nomes de forma agressiva para match inteligente.
 */
function normalizeName(name: string): string {
    if (!name) return '';
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") 
        .replace(/(\d+[,.]\d+|\d+)\s*(kg|g|l|ml|un|porcao|litro|litros|unidade|und|un|pacote|pct|uni)\b/gi, ' ') 
        .replace(/[^\w\s]/gi, ' ')       
        .replace(/\b(maximo|minimo|porcao|unidade|caixa|cx|fardo|uni)\b/gi, ' ')
        .replace(/\s+/g, ' ')            
        .trim();
}

/**
 * Motor de Sugestão V1.1 (Min/Max Logic)
 */
export async function getPurchaseSuggestionAction(sessionId: string) {
    await requireManagerOrAdmin();

    try {
        console.log(`[PurchaseSuggestion V1.1] Analisando sessão: ${sessionId}`);

        // 1. Buscar sessão e resolver Unidade
        const { data: session, error: sessionErr } = await supabase
            .from('count_sessions')
            .select(`
                id, user_id,
                users!user_id(unit_id, primary_group_id, name)
            `)
            .eq('id', sessionId)
            .single();

        if (sessionErr || !session) throw new Error("Sessão não encontrada.");

        const storeId = (session as any).users?.unit_id || (session as any).users?.primary_group_id;
        const userName = (session as any).users?.name || 'Desconhecido';

        const { data: countItems } = await supabase
            .from('count_session_items')
            .select('item_id, counted_quantity, is_zeroed, validated_quantity, validated_is_zeroed, items!inner(name, unit)')
            .eq('session_id', sessionId);

        if (!countItems) throw new Error("Erro ao carregar itens da contagem.");

        // 2. Carregar parâmetros, mapeamentos e catálogo
        const [mappings, params, catalog] = await Promise.all([
            supabase.from('count_to_purchase_item_map').select('*').eq('is_active', true),
            supabase.from('store_item_parameters').select('*').eq('store_id', storeId),
            supabase.from('purchase_items').select('id, name, min_stock, max_stock, count_unit, order_unit').eq('is_active', true)
        ]);

        const paramMap = new Map<string, any>(params.data?.map((p: any) => [p.item_id, p]));
        const pItemMap = new Map<string, any>(catalog.data?.map((p: any) => [p.id, p]));
        const mappingMap = new Map<string, string>(mappings.data?.map((m: any) => [m.count_item_id, m.purchase_item_id]));

        // Match Maps
        const pItemExactMap = new Map<string, any>(catalog.data?.map((p: any) => [p.name.toUpperCase(), p]));
        const pItemNormalizedMap = new Map<string, any>();
        const ambiguousNames = new Set<string>();

        catalog.data?.forEach((p: any) => {
            const norm = normalizeName(p.name);
            if (!norm) return;
            if (pItemNormalizedMap.has(norm)) ambiguousNames.add(norm);
            else pItemNormalizedMap.set(norm, p);
        });

        // Diagnóstico Inicial
        const diagnostic = {
            sessionId,
            userName,
            storeId,
            totalCountItems: countItems.length,
            paramsInStore: params.data?.length || 0,
            activePurchaseItems: catalog.data?.length || 0,
            manualMappings: 0,
            autoMatches: 0,
            noLink: 0,
            hasIdeal: 0,
            noIdeal: 0
        };

        // 3. Processar sugestões com lógica V1.1
        const suggestions: PurchaseSuggestionItem[] = (countItems as any[]).map(ci => {
            const countItemName = ci.items?.name || '';
            
            // Prioridade: Validado > Original
            const isValidated = ci.validated_quantity !== null && ci.validated_quantity !== undefined;
            const finalIsZeroed = isValidated ? ci.validated_is_zeroed : ci.is_zeroed;
            const countedQty = finalIsZeroed ? 0 : (isValidated ? ci.validated_quantity : (ci.counted_quantity ?? 0));
            
            let purchaseItemId = mappingMap.get(ci.item_id);
            let purchaseItem = purchaseItemId ? pItemMap.get(purchaseItemId) : null;
            let mappingType: 'manual' | 'auto' | 'none' = purchaseItemId ? 'manual' : 'none';
            let motivo = '';

            // Fallbacks de Vínculo
            if (!purchaseItem) {
                purchaseItem = pItemExactMap.get(countItemName.toUpperCase());
                if (purchaseItem) {
                    purchaseItemId = purchaseItem.id;
                    mappingType = 'auto';
                } else {
                    const norm = normalizeName(countItemName);
                    if (ambiguousNames.has(norm)) {
                        motivo = 'Match automático ambíguo';
                    } else {
                        purchaseItem = pItemNormalizedMap.get(norm);
                        if (purchaseItem) {
                            purchaseItemId = purchaseItem.id;
                            mappingType = 'auto';
                        }
                    }
                }
            }

            // Estatísticas de Diagnóstico
            if (mappingType === 'manual') diagnostic.manualMappings++;
            else if (mappingType === 'auto') diagnostic.autoMatches++;
            else diagnostic.noLink++;

            let minStock = 0;
            let maxStock = 0;
            let status: PurchaseSuggestionItem['status'] = 'Sem vínculo';

            if (purchaseItem) {
                // Prioridade 1: Loja | Prioridade 2: Global
                const storeParam = paramMap.get(purchaseItem.id);
                minStock = storeParam?.min_stock ?? purchaseItem.min_stock ?? 0;
                maxStock = storeParam?.max_stock ?? purchaseItem.max_stock ?? 0;

                const cUnit = (ci.items?.unit || '').toLowerCase();
                const pUnit = (purchaseItem.count_unit || purchaseItem.order_unit || '').toLowerCase();
                
                // Validação de Unidade
                if (cUnit && pUnit && cUnit !== pUnit && !pUnit.includes(cUnit)) {
                    status = 'Revisar';
                    motivo = `Unidade divergente (${cUnit} vs ${pUnit})`;
                } else if (maxStock === 0) {
                    status = 'Sem estoque ideal';
                    motivo = 'Sem estoque alvo cadastrado';
                    diagnostic.noIdeal++;
                } else {
                    diagnostic.hasIdeal++;
                    // Lógica de Cálculo V1.1
                    if (minStock > 0) {
                        if (countedQty <= minStock) {
                            status = 'Comprar';
                            motivo = 'Abaixo do estoque mínimo';
                        } else {
                            status = 'Não precisa comprar';
                            motivo = 'Estoque suficiente (acima do mínimo)';
                        }
                    } else {
                        // Fallback: Apenas máximo (Target Stock)
                        if (countedQty < maxStock) {
                            status = 'Comprar';
                            motivo = 'Sem mínimo cadastrado - usando estoque alvo';
                        } else {
                            status = 'Não precisa comprar';
                            motivo = 'Estoque suficiente';
                        }
                    }
                }
            } else {
                status = motivo === 'Match automático ambíguo' ? 'Revisar' : 'Sem vínculo';
                if (status === 'Sem vínculo') motivo = 'Sem vínculo com item de compra';
            }

            // Cálculo final da quantidade
            let suggestedQty = 0;
            if (status === 'Comprar') {
                suggestedQty = Math.max(0, maxStock - countedQty);
            }

            return {
                count_item_id: ci.item_id,
                count_item_name: countItemName,
                counted_qty: countedQty,
                purchase_item_id: purchaseItemId,
                purchase_item_name: purchaseItem?.name || '',
                min_stock: minStock,
                max_stock: maxStock,
                suggested_qty: suggestedQty,
                status,
                motivo,
                unit: ci.items?.unit,
                mapping_type: mappingType
            };
        });

        console.log('[PurchaseSuggestion V1.1] Resumo:', diagnostic);
        return { success: true, data: suggestions, diagnostic };
    } catch (err: any) {
        console.error('[ActionError V1.1]:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Salva um vínculo manual.
 */
export async function saveItemMappingAction(countItemId: string, purchaseItemId: string) {
    await requireManagerOrAdmin();
    try {
        const { error } = await supabase.from('count_to_purchase_item_map').upsert({
            count_item_id: countItemId,
            purchase_item_id: purchaseItemId,
            is_active: true,
            updated_at: new Date().toISOString()
        }, { onConflict: 'count_item_id' });
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Busca inteligente no catálogo de compras.
 */
export async function searchPurchaseCatalogAction(query: string) {
    await requireManagerOrAdmin();
    try {
        const norm = normalizeName(query);
        const tokens = norm.split(' ').filter(t => t.length >= 2);
        
        let dbQuery = supabase.from('purchase_items').select('id, name, count_unit, order_unit').eq('is_active', true);

        if (tokens.length > 0) {
            tokens.forEach(t => {
                dbQuery = dbQuery.ilike('name', `%${t}%`);
            });
        } else {
            dbQuery = dbQuery.ilike('name', `%${query}%`);
        }

        const { data, error } = await dbQuery.limit(20);
        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
