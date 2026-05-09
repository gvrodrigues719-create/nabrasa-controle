
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const itemsToAdd = [
    // CK — Insumos
    { name: 'MARGARINA — KG', group: 'CK — Insumos' },
    { name: 'LEITE CONDENSADO — CAIXINHA', group: 'CK — Insumos' },
    { name: 'ARROZ — KG', group: 'CK — Insumos' },
    { name: 'ALHO — KG', group: 'CK — Insumos' },
    { name: 'AÇÚCAR MASCAVO — KG', group: 'CK — Insumos' },
    { name: 'PIMENTA BIQUINHA — BALDE', group: 'CK — Insumos' },
    { name: 'FEIJÃO PRODUZIDO — KG', group: 'CK — Insumos' },
    { name: 'VINAGRE — UN', group: 'CK — Insumos' },
    { name: 'AZEITE 2L — UN', group: 'CK — Insumos' },
    { name: 'ÓLEO 900ML — UN', group: 'CK — Insumos' },
    { name: 'LEITE — CAIXA', group: 'CK — Insumos' },
    { name: 'REQUEIJÃO 1,5KG — BISNAGA', group: 'CK — Insumos' },

    // CK — Carnes e Frios — Insumos
    { name: 'SOBRECOXA — KG', group: 'CK — Carnes e Frios — Insumos' },

    // CK — Produtos de Limpeza
    { name: 'ALVEJANTE HIPOCLORITO DE SÓDIO 2,5% - 5L — UN', group: 'CK — Produtos de Limpeza' },
    { name: 'HIPOCLORITO DE SÓDIO 5% - 5L — UN', group: 'CK — Produtos de Limpeza' },
    { name: 'DESINFETANTE 5L — UN', group: 'CK — Produtos de Limpeza' },
];

async function updateItems() {
    console.log('Starting item update...');

    // Get groups
    const { data: groups, error: groupsError } = await supabase.from('groups').select('id, name');
    if (groupsError) throw groupsError;

    const groupMap = Object.fromEntries(groups.map(g => [g.name, g.id]));

    for (const item of itemsToAdd) {
        const groupId = groupMap[item.group];
        if (!groupId) {
            console.error(`Group not found: ${item.group}`);
            continue;
        }

        // Check if item exists
        let { data: existingItem, error: itemError } = await supabase
            .from('items')
            .select('id, group_id')
            .eq('name', item.name)
            .single();

        if (existingItem) {
            console.log(`Item already exists: ${item.name}. Updating group if needed.`);
            if (existingItem.group_id !== groupId) {
                const { error: updateError } = await supabase
                    .from('items')
                    .update({ group_id: groupId })
                    .eq('id', existingItem.id);
                
                if (updateError) {
                    console.error(`Error updating item ${item.name}:`, updateError);
                } else {
                    console.log(`Updated group for ${item.name} to ${item.group}`);
                }
            }
        } else {
            // Create item with group_id
            const unit = item.name.split(' — ')[1]?.toLowerCase() || 'un';
            const { data: newItem, error: createError } = await supabase
                .from('items')
                .insert({ 
                    name: item.name, 
                    group_id: groupId,
                    unit: unit,
                    active: true,
                    average_cost: 0
                })
                .select('id')
                .single();
            
            if (createError) {
                console.error(`Error creating item ${item.name}:`, createError);
                continue;
            }
            console.log(`Created item: ${item.name} in group ${item.group}`);
        }
    }

    console.log('Update complete!');
}

updateItems().catch(console.error);
