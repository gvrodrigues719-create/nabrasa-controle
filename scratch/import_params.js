const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CAMBOINHAS_UNIT_ID = '3e52d6b2-755d-4bc5-a808-b8ac37ffcee1';

async function run() {
    console.log('--- Iniciando Importação de Parâmetros (Camboinhas) ---');

    try {
        const workbook = XLSX.readFile('data/imports/CAMBOINHAS_COMPRAS_PARAMETROS_SUGESTAO.xlsx');
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);

        console.log(`Lidas ${data.length} linhas da planilha.`);

        // 1. Carregar itens e purchase_items existentes para mapeamento
        const { data: dbItems } = await supabase.from('items').select('id, name');
        const { data: dbPurchaseItems } = await supabase.from('purchase_items').select('id, name');

        const itemNameToId = new Map(dbItems?.map(i => [i.name.toUpperCase(), i.id]));
        const purchaseItemNameToId = new Map(dbPurchaseItems?.map(i => [i.name.toUpperCase(), i.id]));

        let mappedCount = 0;
        let paramCount = 0;
        let errors = 0;

        for (const row of data) {
            if (row.status_importacao !== 'OK') continue;

            const countItemName = String(row.item_contagem || '').toUpperCase();
            const purchaseItemName = String(row.item_compra || '').toUpperCase();
            const idealStock = Number(row.estoque_ideal_para_sugestao);

            const countItemId = itemNameToId.get(countItemName);
            const purchaseItemId = purchaseItemNameToId.get(purchaseItemName);

            if (!purchaseItemId) {
                console.warn(`[Aviso] Item de compra não encontrado no DB: ${row.item_compra}`);
                errors++;
                continue;
            }

            // 2. Upsert store_item_parameters
            const { error: paramErr } = await supabase.from('store_item_parameters').upsert({
                store_id: CAMBOINHAS_UNIT_ID,
                item_id: purchaseItemId,
                max_stock: idealStock,
                min_stock: Number(row.estoque_minimo_planilha) || 0,
                updated_at: new Date().toISOString()
            }, { onConflict: 'store_id,item_id' });

            if (paramErr) {
                console.error(`Erro ao salvar parâmetro para ${row.item_compra}:`, paramErr.message);
                errors++;
            } else {
                paramCount++;
            }

            // 3. Upsert mapping (se count item existir)
            if (countItemId) {
                const { error: mapErr } = await supabase.from('count_to_purchase_item_map').upsert({
                    count_item_id: countItemId,
                    purchase_item_id: purchaseItemId,
                    is_active: true,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'count_item_id,purchase_item_id' });

                if (mapErr) {
                    // Se a tabela não existir ainda, vai dar erro aqui.
                    if (mapErr.code !== 'PGRST204' && !mapErr.message.includes('relation "public.count_to_purchase_item_map" does not exist')) {
                         console.error(`Erro ao salvar mapeamento para ${row.item_contagem}:`, mapErr.message);
                    }
                } else {
                    mappedCount++;
                }
            }
        }

        console.log('\n--- Relatório Final ---');
        console.log(`Parâmetros de estoque salvos: ${paramCount}`);
        console.log(`Mapeamentos realizados: ${mappedCount}`);
        console.log(`Erros/Não encontrados: ${errors}`);

    } catch (e) {
        console.error('Falha fatal na importação:', e);
    }
}

run();
