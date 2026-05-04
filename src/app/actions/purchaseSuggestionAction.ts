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
 * Normaliza nomes para comparação (remove acentos, pesos, ruidos operacionais)
 */
function normalizeName(name: string): string {
    if (!name) return '';
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/[^\w\s]/gi, ' ')       // Remove pontuação/símbolos
        .replace(/\b(\d+(?:[,.]\d+)?\s*(kg|g|l|ml|un|porcao|litro|litros|unidade|und|un|pacote|pct))\b/gi, '') // Remove pesos/unidades
        .replace(/\b(maximo|minimo|porcao|unidade|caixa|cx|fardo)\b/gi, '') // Remove ruidos comuns
        .replace(/\s+/g, ' ')            // Remove espaços duplos
        .trim();
}

/**
 * Gera a sugestão de compras para uma sessão de contagem.
 */
export async function getPurchaseSuggestionAction(sessionId: string) {
    await requireManagerOrAdmin();

    try {
        console.log(`[PurchaseSuggestion] Gerando para sessão: ${sessionId}`);

        // 1. Buscar dados da sessão e itens contados
        const { data: session, error: sessionErr } = await supabase
            .from('count_sessions')
            .select('id, group_id, status, completed_at')
            .eq('id', sessionId)
            .single();

        if (sessionErr || !session) {
            console.error('[PurchaseSuggestion] Erro ao buscar sessão:', sessionErr);
            throw new Error("Sessão não encontrada.");
        }

        const storeId = session.group_id; // Unidade dinâmica
        console.log(`[PurchaseSuggestion] Unidade identificada: ${storeId}`);

        const { data: countItems, error: itemsErr } = await supabase
            .from('count_session_items')
            .select('item_id, counted_quantity, is_zeroed, items!inner(name, unit)')
            .eq('session_id', sessionId);

        if (itemsErr || !countItems) {
            console.error('[PurchaseSuggestion] Erro ao buscar itens:', itemsErr);
            throw new Error("Erro ao carregar itens da contagem.");
        }

        // 2. Carregar parâmetros do Banco
        const { data: dbMappings } = await supabase.from('count_to_purchase_item_map').select('*').eq('is_active', true);
        const { data: dbParams } = await supabase.from('store_item_parameters').select('*').eq('store_id', storeId);
        const { data: purchaseItems } = await supabase.from('purchase_items').select('id, name, max_stock, unit');

        const paramMap = new Map<string, any>(dbParams?.map((p: any) => [p.item_id, p]));
        const pItemMap = new Map<string, any>(purchaseItems?.map((p: any) => [p.id, p]));
        const mappingMap = new Map<string, string>(dbMappings?.map((m: any) => [m.count_item_id, m.purchase_item_id]));

        // Criar mapa normalizado de itens de compra para match inteligente
        const pItemNormalizedMap = new Map<string, any>();
        purchaseItems?.forEach((p: any) => {
            const norm = normalizeName(p.name);
            if (norm && !pItemNormalizedMap.has(norm)) {
                pItemNormalizedMap.set(norm, p);
            }
        });

        // 3. Processar sugestões
        const suggestions: PurchaseSuggestionItem[] = (countItems as any[]).map(ci => {
            const countItemName = ci.items?.name || 'Item Desconhecido';
            const countedQty = ci.is_zeroed ? 0 : (ci.counted_quantity ?? 0);
            
            // Busca de Vínculo:
            // 1. Mapeamento explícito (Tabela de vínculo)
            let purchaseItemId = mappingMap.get(ci.item_id);
            let purchaseItem = purchaseItemId ? pItemMap.get(purchaseItemId) : null;
            let isManualMapping = !!purchaseItemId;

            // 2. Fallback Inteligente (Normalização)
            if (!purchaseItem) {
                const normalizedCountName = normalizeName(countItemName);
                purchaseItem = pItemNormalizedMap.get(normalizedCountName);
                if (purchaseItem) {
                    purchaseItemId = purchaseItem.id;
                }
            }

            let purchaseItemName = purchaseItem?.name || '';
            let idealStock = 0;
            let status: PurchaseSuggestionItem['status'] = 'Sem vínculo';
            let statusDetail = '';

            if (purchaseItem) {
                const unitParam = paramMap.get(purchaseItem.id);
                idealStock = unitParam?.max_stock || purchaseItem.max_stock || 0;
                
                if (!isManualMapping) {
                    const countUnit = (ci.items?.unit || '').toLowerCase();
                    const purchaseUnit = (purchaseItem.unit || '').toLowerCase();
                    
                    // Se as unidades existirem e forem diferentes, exige revisão (fallback inseguro)
                    if (countUnit && purchaseUnit && countUnit !== purchaseUnit) {
                        status = 'Revisar';
                        statusDetail = `Unidade divergente (${countUnit} vs ${purchaseUnit})`;
                    } else {
                        status = idealStock === 0 ? 'Sem estoque ideal' : 'Comprar';
                    }
                } else {
                    status = idealStock === 0 ? 'Sem estoque ideal' : 'Comprar';
                }
            }

            // Cálculo final
            let suggestedQty = 0;
            if (status !== 'Sem vínculo' && status !== 'Sem estoque ideal' && status !== 'Revisar') {
                suggestedQty = Math.max(0, idealStock - countedQty);
                status = suggestedQty === 0 ? 'Não precisa comprar' : 'Comprar';
            } else {
                suggestedQty = 0;
            }

            return {
                count_item_id: ci.item_id,
                count_item_name: countItemName,
                counted_qty: countedQty,
                purchase_item_id: purchaseItemId,
                purchase_item_name: purchaseItemName,
                ideal_stock: idealStock,
                suggested_qty: suggestedQty,
                status,
                status_detail: statusDetail,
                unit: ci.items?.unit
            };
        });

        return { success: true, data: suggestions };
    } catch (err: any) {
        console.error('[PurchaseSuggestion] Erro:', err);
        return { success: false, error: "Falha ao gerar sugestão. Verifique os parâmetros de estoque." };
    }
}

/**
 * Salva um vínculo manual entre item de contagem e item de compra.
 */
export async function saveItemMappingAction(countItemId: string, purchaseItemId: string) {
    const profile = await requireManagerOrAdmin();
    
    try {
        const { error } = await supabase
            .from('count_to_purchase_item_map')
            .upsert({
                count_item_id: countItemId,
                purchase_item_id: purchaseItemId,
                is_active: true,
                updated_at: new Date().toISOString()
            }, { onConflict: 'count_item_id' });

        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        console.error('[SaveMapping] Erro:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Busca itens do catálogo de compras para o dropdown de vínculo.
 */
export async function searchPurchaseCatalogAction(query: string) {
    await requireManagerOrAdmin();
    try {
        const { data, error } = await supabase
            .from('purchase_items')
            .select('id, name, unit')
            .ilike('name', `%${query}%`)
            .eq('is_active', true)
            .limit(10);
            
        if (error) throw error;
        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
