const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fix() {
    // 1. Encontrar o grupo da Cozinha (Produção)
    const { data: groups } = await supabase.from('groups').select('id, name');
    const kitchenGroup = groups.find(g => g.name.includes('Cozinha'));
    const unitGroup = groups.find(g => g.name.includes('Camboinhas'));

    console.log('Kitchen Group:', kitchenGroup?.name, kitchenGroup?.id);
    console.log('Unit Group:', unitGroup?.name, unitGroup?.id);

    if (kitchenGroup) {
        // Fix Cozinha Central user
        const { error: e1 } = await supabase.from('users')
            .update({ primary_group_id: kitchenGroup.id })
            .ilike('name', '%Cozinha Central%');
        if (e1) console.error('Error fixing Cozinha Central:', e1);
        else console.log('Fixed Cozinha Central user.');
    }

    if (unitGroup) {
        // Fix Manager users
        const { error: e2 } = await supabase.from('users')
            .update({ primary_group_id: unitGroup.id })
            .in('name', ['Allan', 'Guilherme Gerente']);
        if (e2) console.error('Error fixing Managers:', e2);
        else console.log('Fixed Managers users.');
    }
}

fix();
