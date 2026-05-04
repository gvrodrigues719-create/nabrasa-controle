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
    ideal_stock: number
    suggested_qty: number
    status: 'Comprar' | 'Não precisa comprar' | 'Sem estoque ideal' | 'Sem vínculo' | 'Revisar'
    status_detail?: string
    unit?: string
}

/**
 * Normaliza nomes de forma agressiva para match inteligente.
 */
function normalizeName(name: string): string {
    if (!name) return '';
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/(\d+[,.]\d+|\d+)\s*(kg|g|l|ml|un|porcao|litro|litros|unidade|und|un|pacote|pct|uni)\b/gi, ' ') // Remove 0,18kg, 5un, etc
        .replace(/[^\w\s]/gi, ' ')       // Remove pontuação
        .replace(/\b(maximo|minimo|porcao|unidade|caixa|cx|fardo|uni|uni)\b/gi, ' ')
        .replace(/\s+/g, ' ')            // Remove espaços duplos
        .trim();
}

export async function getPurchaseSuggestionAction(sessionId: string) {
    await requireManagerOrAdmin();

    try {
        // 1. Buscar sessão e resolver Unidade Real
        const { data: session, error: sessionErr } = await supabase
            .from('count_sessions')
            .select(`
                id, 
                user_id,
                users!user_id(unit_id, primary_group_id)
            `)
            .eq('id', sessionId)
            .single();

        if (sessionErr || !session) throw new Error("Sessão não encontrada.");

        const storeId = (session as any).users?.unit_id || (session as any).users?.primary_group_id;
        
        const { data: countItems } = await supabase
            .from('count_session_items')
            .select('item_id, counted_quantity, is_zeroed, items!inner(name, unit)')
            .eq('session_id', sessionId);

        if (!countItems) throw new Error("Erro ao carregar itens da contagem.");

        // 2. Carregar parâmetros e catálogo
        const [mappings, params, catalog] = await Promise.all([
            supabase.from('count_to_purchase_item_map').select('*').eq('is_active', true),
            supabase.from('store_item_parameters').select('*').eq('store_id', storeId),
            supabase.from('purchase_items').select('id, name, max_stock, count_unit, order_unit').eq('is_active', true)
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

        const diagnostic = { total: countItems.length, manual: 0, auto: 0, noLink: 0 };

        const suggestions: PurchaseSuggestionItem[] = (countItems as any[]).map(ci => {
            const countItemName = ci.items?.name || '';
            const countedQty = ci.is_zeroed ? 0 : (ci.counted_quantity ?? 0);
            
            // 1. Manual
            let purchaseItemId = mappingMap.get(ci.item_id);
            let purchaseItem = purchaseItemId ? pItemMap.get(purchaseItemId) : null;
            let isManualMapping = !!purchaseItemId;
            let statusDetail = '';

            // 2. Exact Name Match (Safe)
            if (!purchaseItem) {
                purchaseItem = pItemExactMap.get(countItemName.toUpperCase());
                if (purchaseItem) purchaseItemId = purchaseItem.id;
            }

            // 3. Smart Fallback
            if (!purchaseItem) {
                const norm = normalizeName(countItemName);
                if (ambiguousNames.has(norm)) {
                    statusDetail = 'Ambiguidade detectada';
                } else {
                    purchaseItem = pItemNormalizedMap.get(norm);
                    if (purchaseItem) purchaseItemId = purchaseItem.id;
                }
            }

            if (isManualMapping) diagnostic.manual++;
            else if (purchaseItem) diagnostic.auto++;
            else diagnostic.noLink++;

            let idealStock = 0;
            let status: PurchaseSuggestionItem['status'] = 'Sem vínculo';

            if (purchaseItem) {
                const param = paramMap.get(purchaseItem.id);
                idealStock = param?.max_stock || purchaseItem.max_stock || 0;
                
                if (!isManualMapping) {
                    const cUnit = (ci.items?.unit || '').toLowerCase();
                    const pUnit = (purchaseItem.count_unit || purchaseItem.order_unit || '').toLowerCase();
                    if (cUnit && pUnit && cUnit !== pUnit && !pUnit.includes(cUnit)) {
                        status = 'Revisar';
                        statusDetail = `Unid. divergente (${cUnit} vs ${pUnit})`;
                    } else {
                        status = idealStock === 0 ? 'Sem estoque ideal' : 'Comprar';
                    }
                } else {
                    status = idealStock === 0 ? 'Sem estoque ideal' : 'Comprar';
                }
            }

            let suggestedQty = 0;
            if (status !== 'Sem vínculo' && status !== 'Sem estoque ideal' && status !== 'Revisar') {
                suggestedQty = Math.max(0, idealStock - countedQty);
                status = suggestedQty === 0 ? 'Não precisa comprar' : 'Comprar';
            }

            return {
                count_item_id: ci.item_id,
                count_item_name: countItemName,
                counted_qty: countedQty,
                purchase_item_id: purchaseItemId,
                purchase_item_name: purchaseItem?.name || '',
                ideal_stock: idealStock,
                suggested_qty: suggestedQty,
                status,
                status_detail: statusDetail,
                unit: ci.items?.unit
            };
        });

        return { success: true, data: suggestions, diagnostic };
    } catch (err: any) {
        console.error('[ActionError]:', err);
        return { success: false, error: err.message };
    }
}

export async function searchPurchaseCatalogAction(query: string) {
    await requireManagerOrAdmin();
    try {
        const norm = normalizeName(query);
        const tokens = norm.split(' ').filter(t => t.length >= 2);
        
        let dbQuery = supabase.from('purchase_items').select('id, name, count_unit, order_unit').eq('is_active', true);

        // Busca AND (todas as palavras devem estar presentes)
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
