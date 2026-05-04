'use server'

import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'
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

        const { data: countItems, error: itemsErr } = await supabase
            .from('count_session_items')
            .select('item_id, counted_quantity, is_zeroed, items!inner(name, unit)')
            .eq('session_id', sessionId);

        if (itemsErr || !countItems) {
            console.error('[PurchaseSuggestion] Erro ao buscar itens:', itemsErr);
            throw new Error("Erro ao carregar itens da contagem.");
        }

        console.log(`[PurchaseSuggestion] Encontrados ${countItems.length} itens na contagem.`);

        // 2. Carregar parâmetros da planilha (Referência Real)
        const excelPath = path.join(process.cwd(), 'data/imports/CAMBOINHAS_COMPRAS_PARAMETROS_SUGESTAO.xlsx');
        let excelData: any[] = [];
        if (fs.existsSync(excelPath)) {
            const workbook = XLSX.readFile(excelPath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            excelData = XLSX.utils.sheet_to_json(sheet);
        }

        // Criar mapa de busca por nome (uppercase para match insensível)
        const excelMap = new Map();
        excelData.forEach((row: any) => {
            const key = String(row.item_contagem || '').toUpperCase();
            excelMap.set(key, row);
        });

        // 3. Carregar mapeamentos do banco (se existirem) e parâmetros do banco
        // Tentamos ler da tabela de mapeamento, se falhar (tabela não existe), usamos apenas o Excel.
        const { data: dbMappings } = await supabase.from('count_to_purchase_item_map').select('*').eq('is_active', true).catch(() => ({ data: [] }));
        const { data: dbParams } = await supabase.from('store_item_parameters').select('*').eq('store_id', CAMBOINHAS_UNIT_ID);
        const { data: purchaseItems } = await supabase.from('purchase_items').select('id, name, max_stock');

        const paramMap = new Map(dbParams?.map((p: any) => [p.item_id, p]));
        const pItemMap = new Map(purchaseItems?.map((p: any) => [p.id, p]));
        const mappingMap = new Map(dbMappings?.map((m: any) => [m.count_item_id, m.purchase_item_id]));

        // 4. Processar sugestões
        const suggestions: PurchaseSuggestionItem[] = (countItems as any[]).map(ci => {
            const itemName = ci.items?.name || 'Item Desconhecido';
            const countedQty = ci.is_zeroed ? 0 : (ci.counted_quantity ?? 0);
            const excelRow = excelMap.get(itemName.toUpperCase());
            
            let purchaseItemId = mappingMap.get(ci.item_id) as string | undefined;
            let purchaseItemName = '';
            let idealStock = 0;
            let status: PurchaseSuggestionItem['status'] = 'Sem vínculo';
            let statusDetail = '';

            // Lógica de Prioridade:
            // 1. Se tem Excel Row, usa os dados dela (Referência Real solicitada)
            if (excelRow) {
                purchaseItemName = excelRow.item_compra;
                idealStock = Number(excelRow.estoque_ideal_para_sugestao);
                
                if (excelRow.status_importacao !== 'OK') {
                    status = 'Revisar';
                    statusDetail = excelRow.observacao || 'Status de importação não OK';
                } else if (isNaN(idealStock) || idealStock === 0) {
                    status = 'Sem estoque ideal';
                } else {
                    status = 'Comprar'; // Temporário, será validado abaixo
                }
            } else if (purchaseItemId) {
                // 2. Fallback para mapeamento no DB
                const pItem = pItemMap.get(purchaseItemId);
                const param = paramMap.get(purchaseItemId);
                purchaseItemName = pItem?.name || '';
                idealStock = param?.max_stock || pItem?.max_stock || 0;
                
                if (idealStock === 0) status = 'Sem estoque ideal';
                else status = 'Comprar';
            }

            // Cálculo final se houver estoque ideal
            let suggestedQty = 0;
            if (status !== 'Sem vínculo' && status !== 'Sem estoque ideal' && status !== 'Revisar') {
                suggestedQty = Math.max(0, idealStock - countedQty);
                if (suggestedQty === 0) {
                    status = 'Não precisa comprar';
                } else {
                    status = 'Comprar';
                }
            } else {
                suggestedQty = 0;
            }

            return {
                count_item_id: ci.item_id,
                count_item_name: itemName,
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
        return { success: false, error: err.message };
    }
}
