
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function addAndInjectBacon() {
    const gCarnesId = 'f28e190c-44fa-4992-ab4e-d1081780335b'; // CK — Carnes e Frios — Insumos
    const sCarnesId = 'f7fbf3df-ba54-43a1-882a-5568b3db05e6'; // Sessão de hoje

    console.log('--- Criando item BACON FATIADO ---');
    const { data: newItem, error: niErr } = await supabase.from('items').upsert({
        name: 'BACON FATIADO — KG',
        unit: 'KG',
        group_id: gCarnesId,
        active: true
    }, { onConflict: 'name' }).select().single();

    if (niErr) {
        console.error('Erro ao criar item:', niErr.message);
        return;
    }

    console.log(`Item criado/verificado: ${newItem.name} (${newItem.id})`);

    console.log('--- Injetando na sessão de hoje ---');
    const { error: iErr } = await supabase.from('count_session_items').upsert({
        session_id: sCarnesId,
        item_id: newItem.id,
        counted_quantity: 0, // Vou deixar 0 para ele corrigir na tela se quiser
        updated_at: new Date().toISOString()
    }, { onConflict: 'session_id,item_id' });

    if (iErr) {
        console.error('Erro ao injetar na sessão:', iErr.message);
    } else {
        console.log('Bacon Fatiado injetado com sucesso na sessão de Carnes.');
    }
}

addAndInjectBacon().catch(console.error);
