const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seed() {
    console.log('🌱 Iniciando Seed de Demonstração...');

    const { data: groups } = await supabase.from('groups').select('id, name');
    const kitchen = groups.find(g => g.name.includes('Cozinha (Carnes)'));
    const unit = groups.find(g => g.name.includes('Camboinhas'));

    if (!kitchen || !unit) {
        console.error('Grupos não encontrados.');
        return;
    }

    let rawItem;
    const { data: existingRaw } = await supabase.from('purchase_items')
        .select('*')
        .eq('name', 'CORAÇÃO DE FRANGO BRUTO (KG)')
        .maybeSingle();

    if (existingRaw) {
        rawItem = existingRaw;
    } else {
        const { data: newRaw } = await supabase.from('purchase_items').insert({
            name: 'CORAÇÃO DE FRANGO BRUTO (KG)',
            category: 'Proteínas',
            order_unit: 'kg',
            count_unit: 'kg',
            allows_decimal: true,
            origin: 'fornecedor'
        }).select().single();
        rawItem = newRaw;
    }

    const { data: finishedItem } = await supabase.from('purchase_items')
        .select('id, name')
        .eq('name', 'ESPETO CORAÇÃO C/5 UN')
        .maybeSingle();

    if (!rawItem || !finishedItem) {
        console.error('Itens não encontrados.');
        return;
    }

    await supabase.from('recipes').upsert({
        product_id: finishedItem.id,
        ingredient_id: rawItem.id,
        quantity: 0.150,
        unit: 'kg',
        yield_percentage: 100.0,
        ingredient_stock_type: 'raw'
    }, { onConflict: 'product_id,ingredient_id' });

    const { data: user } = await supabase.from('users').select('id').limit(1).single();

    const { data: order, error } = await supabase.from('purchase_orders').insert({
        store_id: unit.id,
        order_type: 'internal_replenishment',
        source_location_id: kitchen.id,
        destination_location_id: unit.id,
        status: 'em_separacao',
        created_by: user.id
    }).select().single();

    if (error) {
        console.error('Order Error:', error);
        return;
    }

    await supabase.from('purchase_order_items').insert({
        order_id: order.id,
        item_id: finishedItem.id,
        requested_qty: 20
    });

    await supabase.from('inventory_balances').upsert({
        item_id: rawItem.id,
        location_id: kitchen.id,
        type: 'raw',
        quantity: 50.0
    }, { onConflict: 'item_id,location_id,type' });

    console.log('✅ Demonstração criada!');
}

seed();
