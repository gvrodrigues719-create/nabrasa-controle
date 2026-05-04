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

const CAMBOINHAS_UNIT_ID = '3e52d6b2-755d-4bc5-a808-b8ac37ffcee1';

/**
 * Gera a sugestão de compras para uma sessão de contagem baseada exclusivamente no Banco de Dados.
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

        const { data: countItems, error: itemsErr } = await supabase
            .from('count_session_items')
            .select('item_id, counted_quantity, is_zeroed, items!inner(name, unit)')
            .eq('session_id', sessionId);

        if (itemsErr || !countItems) {
            console.error('[PurchaseSuggestion] Erro ao buscar itens:', itemsErr);
            throw new Error("Erro ao carregar itens da contagem.");
        }

        // 2. Carregar parâmetros do Banco (Única fonte de verdade agora)
        const { data: dbMappings } = await supabase.from('count_to_purchase_item_map').select('*').eq('is_active', true);
        const { data: dbParams } = await supabase.from('store_item_parameters').select('*').eq('store_id', CAMBOINHAS_UNIT_ID);
        const { data: purchaseItems } = await supabase.from('purchase_items').select('id, name, max_stock');

        const paramMap = new Map<string, any>(dbParams?.map((p: any) => [p.item_id, p]));
        const pItemMap = new Map<string, any>(purchaseItems?.map((p: any) => [p.id, p]));
        const pItemByNameMap = new Map<string, any>(purchaseItems?.map((p: any) => [p.name.toUpperCase(), p]));
        const mappingMap = new Map<string, string>(dbMappings?.map((m: any) => [m.count_item_id, m.purchase_item_id]));

        // 3. Processar sugestões
        const suggestions: PurchaseSuggestionItem[] = (countItems as any[]).map(ci => {
            const countItemName = ci.items?.name || 'Item Desconhecido';
            const countedQty = ci.is_zeroed ? 0 : (ci.counted_quantity ?? 0);
            
            // Tenta encontrar o vínculo: 
            // 1. Via tabela de mapeamento explícito
            // 2. Via nome exato (fallback automático para itens importados)
            let purchaseItemId = mappingMap.get(ci.item_id);
            let purchaseItem = purchaseItemId ? pItemMap.get(purchaseItemId) : pItemByNameMap.get(countItemName.toUpperCase());
            
            if (purchaseItem && !purchaseItemId) {
                purchaseItemId = purchaseItem.id;
            }

            let purchaseItemName = purchaseItem?.name || '';
            let idealStock = 0;
            let status: PurchaseSuggestionItem['status'] = 'Sem vínculo';
            let statusDetail = '';

            if (purchaseItem) {
                // Lógica de Prioridade de Estoque Ideal:
                // 1. store_item_parameters.max_stock (unidade)
                // 2. purchase_items.max_stock (global)
                const unitParam = paramMap.get(purchaseItem.id);
                idealStock = unitParam?.max_stock || purchaseItem.max_stock || 0;
                
                if (idealStock === 0) {
                    status = 'Sem estoque ideal';
                } else {
                    status = 'Comprar'; // Temporário
                }
            }

            // Cálculo final se houver estoque ideal
            let suggestedQty = 0;
            if (status !== 'Sem vínculo' && status !== 'Sem estoque ideal') {
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
        console.error('[PurchaseSuggestion] Erro Crítico:', err);
        // Retorna mensagem amigável para o usuário, sem caminhos de arquivo internos
        return { 
            success: false, 
            error: "Não foi possível gerar a sugestão. Verifique os parâmetros de estoque da unidade no painel administrativo." 
        };
    }
}
