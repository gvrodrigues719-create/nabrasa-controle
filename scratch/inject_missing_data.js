
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function injectData() {
    const sInsumosId = '23e0023f-a3e1-4b6f-be67-9231f103a193';
    const sCarnesId = 'f7fbf3df-ba54-43a1-882a-5568b3db05e6';
    const uCozinhaId = 'b63649c8-779a-4387-b8f3-b276774c9c4a'; 
    const rKitchenId = '71bee6e1-5869-413f-9b23-be3d6fdb2e9d'; // ID CORRETO

    const itemsToInject = [
        { name: 'MARGARINA — KG', qty: 15, sessionId: sInsumosId },
        { name: 'LEITE CONDENSADO — CAIXINHA', qty: 27, sessionId: sInsumosId },
        { name: 'ARROZ — KG', qty: 10, sessionId: sInsumosId },
        { name: 'ALHO — KG', qty: 16, sessionId: sInsumosId },
        { name: 'AÇÚCAR MASCAVO — KG', qty: 3, sessionId: sInsumosId },
        { name: 'PIMENTA BIQUINHA — BALDE', qty: 1, sessionId: sInsumosId },
        { name: 'FEIJÃO PRODUZIDO — KG', qty: 3, sessionId: sInsumosId },
        { name: 'VINAGRE — UN', qty: 12, sessionId: sInsumosId },
        { name: 'AZEITE 2L — UN', qty: 2, sessionId: sInsumosId },
        { name: 'ÓLEO 900ML — UN', qty: 18, sessionId: sInsumosId },
        { name: 'LEITE — CAIXA', qty: 15, sessionId: sInsumosId },
        { name: 'REQUEIJÃO 1,5KG — BISNAGA', qty: 2, sessionId: sInsumosId },
        { name: 'SOBRECOXA — KG', qty: 0, sessionId: sCarnesId }, 
    ];

    console.log('--- Injetando Itens em Sessões Existentes ---');
    for (const item of itemsToInject) {
        const { data: itm } = await supabase.from('items').select('id').ilike('name', item.name).limit(1).single();
        if (itm) {
            const { error } = await supabase.from('count_session_items').upsert({
                session_id: item.sessionId,
                item_id: itm.id,
                counted_quantity: item.qty,
                updated_at: new Date().toISOString()
            }, { onConflict: 'session_id,item_id' });
            
            if (error) console.error(`Erro ao injetar ${item.name}:`, error.message);
            else console.log(`Injetado: ${item.name} -> ${item.qty}`);
        }
    }

    console.log('--- Criando sessão de Limpeza ---');
    const { data: gLimpeza } = await supabase.from('groups').select('id').eq('name', 'CK — Produtos de Limpeza').single();
    if (gLimpeza) {
        const { data: newSess, error: nsErr } = await supabase.from('count_sessions').insert({
            routine_id: rKitchenId,
            group_id: gLimpeza.id,
            user_id: uCozinhaId,
            status: 'completed',
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString()
        }).select().single();

        if (nsErr) {
            console.error('Erro ao criar sessão de limpeza:', nsErr.message);
            return;
        }
        
        const limpezaItems = [
            { name: 'ALVEJANTE HIPOCLORITO DE SÓDIO 2,5% - 5L — UN', qty: 2 },
            { name: 'HIPOCLORITO DE SÓDIO 5% - 5L — UN', qty: 2 },
            { name: 'DESINFETANTE 5L — UN', qty: 1 }
        ];

        for (const li of limpezaItems) {
            const { data: itm } = await supabase.from('items').select('id').ilike('name', li.name).limit(1).single();
            if (itm) {
                await supabase.from('count_session_items').upsert({
                    session_id: newSess.id,
                    item_id: itm.id,
                    counted_quantity: li.qty
                }, { onConflict: 'session_id,item_id' });
                console.log(`Injetado Limpeza: ${li.name} -> ${li.qty}`);
            }
        }
    }
    console.log('--- Injeção Concluída ---');
}

injectData().catch(console.error);
