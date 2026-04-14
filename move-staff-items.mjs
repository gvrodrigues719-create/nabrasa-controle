import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function run() {
    console.log("Iniciando adequação de grupos...");

    // 1. Criar novo grupo
    const groupName = "Refeição Funcionários"
    let { data: newGroup, error: grpErr } = await supabase.from('groups').select('id').eq('name', groupName).single();

    if (!newGroup) {
        const { data: inserted, error: insertErr } = await supabase.from('groups').insert([{ name: groupName }]).select('id').single();
        if (insertErr) {
            console.error("Erro ao criar grupo:", insertErr.message);
            return;
        }
        newGroup = inserted;
        console.log("Criado grupo:", groupName);
    } else {
        console.log("Grupo já existia:", groupName);
    }

    const groupId = newGroup.id;

    // 2. Localizar itens que contém "Funcionário" ou parecidos
    const { data: items, error: itErr } = await supabase.from('items').select('id, name, group_id').ilike('name', '%funcionário%');

    if (itErr) {
        console.error("Erro buscando itens:", itErr.message);
        return;
    }

    console.log(`Encontrados ${items.length} itens.`);

    // 3. Atualizar os itens
    for (const item of items) {
        if (item.group_id !== groupId) {
            const { error: updErr } = await supabase.from('items').update({ group_id: groupId }).eq('id', item.id);
            if (updErr) console.error("Erro atualizando", item.name, updErr.message);
            else console.log(`Item movido: ${item.name}`);
        }
    }

    // 4. Vincular esse novo grupo às Rotinas ativas (para que apareça nas contagens)
    const { data: routines } = await supabase.from('routines').select('id, name');
    for (const routine of routines || []) {
        const { data: exists } = await supabase.from('routine_groups').select('id').eq('routine_id', routine.id).eq('group_id', groupId).maybeSingle();
        if (!exists) {
            await supabase.from('routine_groups').insert([{ routine_id: routine.id, group_id: groupId }]);
            console.log(`Grupo vinculado à rotina: ${routine.name}`);
        }
    }

    console.log("Concluído!");
}

run();
