
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function addAndInjectNataliaItems() {
    console.log('--- Buscando Sessões Ativas de Hoje ---');
    
    // Buscar sessões de hoje
    const { data: sessions } = await supabase.from('count_sessions')
        .select('id, groups(name)')
        .gte('started_at', '2026-05-08T00:00:00-03:00')
        .lte('started_at', '2026-05-08T23:59:59-03:00');

    const sDescartaveis = sessions.find(s => s.groups?.name === 'CK — Descartáveis');
    const sLimpeza = sessions.find(s => s.groups?.name === 'CK — Produtos de Limpeza');

    if (!sDescartaveis || !sLimpeza) {
        console.error('Sessões não encontradas para hoje. Descartáveis:', !!sDescartaveis, 'Limpeza:', !!sLimpeza);
        console.log('Sessões disponíveis:', sessions);
        return;
    }

    console.log('Sessão Descartáveis:', sDescartaveis.id);
    console.log('Sessão Limpeza:', sLimpeza.id);

    const itemsToAdd = [
        { name: 'ÁLCOOL — CAIXA (12 UN)', unit: 'CX', groupName: 'CK — Produtos de Limpeza', qty: 1, sessionId: sLimpeza.id },
        { name: 'PAPEL TOALHA — UN', unit: 'UN', groupName: 'CK — Produtos de Limpeza', qty: 8, sessionId: sLimpeza.id },
        { name: 'SACO PRETO 105 LITROS — UN', unit: 'UN', groupName: 'CK — Produtos de Limpeza', qty: 1, sessionId: sLimpeza.id },
        { name: 'SACO PRETO 200 LITROS — PCT', unit: 'PCT', groupName: 'CK — Produtos de Limpeza', qty: 7, sessionId: sLimpeza.id },
        { name: 'SACO VIRGEM — PCT', unit: 'PCT', groupName: 'CK — Descartáveis', qty: 1, sessionId: sDescartaveis.id },
        { name: 'SALADEIRA 1000ML — CX', unit: 'CX', groupName: 'CK — Descartáveis', qty: 1, sessionId: sDescartaveis.id },
        { name: 'TALHER DESCARTÁVEL — PCT', unit: 'PCT', groupName: 'CK — Descartáveis', qty: 1, sessionId: sDescartaveis.id },
        { name: 'POTE 145ML (MOLHO) — PCT', unit: 'PCT', groupName: 'CK — Descartáveis', qty: 15, sessionId: sDescartaveis.id },
        { name: 'BOBINA DE IMPRESSORA — UN', unit: 'UN', groupName: 'CK — Descartáveis', qty: 20, sessionId: sDescartaveis.id },
        { name: 'POTE DE PUDIM — UN', unit: 'UN', groupName: 'CK — Descartáveis', qty: 12, sessionId: sDescartaveis.id }
    ];

    for (const item of itemsToAdd) {
        // Buscar grupo correto
        const { data: grp } = await supabase.from('groups').select('id').eq('name', item.groupName).limit(1).single();
        if (!grp) {
            console.error('Grupo não encontrado:', item.groupName);
            continue;
        }

        // Buscar ou Criar Item
        let { data: itm } = await supabase.from('items').select('id').eq('name', item.name).limit(1).single();
        
        if (!itm) {
            const { data: newItm, error: niErr } = await supabase.from('items').insert({
                name: item.name,
                unit: item.unit,
                group_id: grp.id,
                active: true
            }).select().single();
            
            if (niErr) {
                console.error(`Erro ao criar ${item.name}:`, niErr.message);
                continue;
            }
            itm = newItm;
        }

        const { error: injErr } = await supabase.from('count_session_items').upsert({
            session_id: item.sessionId,
            item_id: itm.id,
            counted_quantity: item.qty,
            updated_at: new Date().toISOString()
        }, { onConflict: 'session_id,item_id' });

        if (injErr) {
            console.error(`Erro ao injetar ${item.name}:`, injErr.message);
        } else {
            console.log(`Sucesso: ${item.name} -> ${item.qty}`);
        }
    }
    
    await supabase.from('count_sessions').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', sDescartaveis.id);
    console.log('--- Processo Concluído ---');
}

addAndInjectNataliaItems().catch(console.error);
