import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function run() {
    console.log("Iniciando Mapeamento Físico e Sanitização...");

    const newGroups = [
        "Carnes, Espetos e Resfriados",
        "Estoque Seco / Mercearia / Molhos / Temperos",
        "Congelados / Guarnições",
        "Laticínios / Padaria / Sobremesas"
    ];

    const groupMap = {};
    for (const name of newGroups) {
        let { data: grp } = await supabase.from('groups').select('*').eq('name', name).single();
        if (!grp) {
            const { data } = await supabase.from('groups').insert({ name }).select().single();
            grp = data;
        }
        groupMap[name] = grp.id;
    }

    const { data: cozinhaGrp } = await supabase.from('groups').select('*').eq('name', 'Cozinha').single();
    if (!cozinhaGrp) {
        console.log("Cozinha não encontrada ou já migrada.");
        return;
    }

    const { data: items } = await supabase.from('items').select('*').eq('group_id', cozinhaGrp.id);

    const g1 = groupMap["Carnes, Espetos e Resfriados"];
    const g2 = groupMap["Estoque Seco / Mercearia / Molhos / Temperos"];
    const g3 = groupMap["Congelados / Guarnições"];
    const g4 = groupMap["Laticínios / Padaria / Sobremesas"];

    for (const item of items) {
        let destGroup = null;
        let newName = item.name;

        // 1. Sanitização
        if (newName.includes("PCT100")) newName = newName.replace("PCT100", "PCT 100");
        if (newName.includes("Azeite de Oliva 60% 5 Litros")) newName = "Azeite de Oliva 60%";
        if (newName.includes("Bacon em Tiras 250g")) newName = "Bacon em Tiras";
        if (newName.includes("Cebola Caramelizada 1,05kg")) newName = "Cebola Caramelizada";
        if (newName.includes("Coxa Sobrecoxa Fgo Temp NaBrasa 800g")) newName = "Coxa Sobrecoxa Temp NaBrasa";
        if (newName.includes("Ketchup Pote 1kg")) newName = "Ketchup";
        if (newName.includes("Maionese Temperada 500g")) newName = "Maionese Temperada";
        if (newName.includes("Molho Cheddar 1,5kg Vigor")) newName = "Molho Cheddar Vigor";
        if (newName.includes("Mostarda 1,1kg Junior")) newName = "Mostarda Junior";

        // Exclusão definitiva de QA_ITEM
        if (newName === "QA_ITEM_TESTE" || newName.includes("QA_ITEM")) {
            await supabase.from('items').delete().eq('id', item.id);
            console.log(`Item de Teste DELETADO: ${item.name}`);
            continue;
        }

        const nameLower = newName.toLowerCase();

        // 2. Classificação Física (Prioridade: Laticínios e Congelados antes da Carnes)
        // Espeto de Queijo Coalho vai para Carnes para contar junto com Espetos.
        // Ovos, Manteiga/Margarina, Biscoito, Café, Croutons vão para Laticínios/Padaria.

        if (nameLower.includes('aipim') || nameLower.includes('batata') || nameLower.includes('bolinho') ||
            nameLower.includes('pastel') || nameLower.includes('feijão')) {
            destGroup = g3; // Congelados / Guarnições
        }
        else if (nameLower.includes('biscoito') || nameLower.includes('cápsula') || nameLower.includes('croutons') ||
            nameLower.includes('leite') || nameLower.includes('margarina') || nameLower.includes('ovo') ||
            nameLower.includes('pudim') || (nameLower.includes('queijo') && !nameLower.includes('espeto')) ||
            nameLower.includes('pão') || nameLower.includes('cheddar 3')) {
            destGroup = g4; // Laticínios / Padaria / Sobremesas
        }
        else if (nameLower.includes('bife') || nameLower.includes('costela') || nameLower.includes('hambúrguer') ||
            nameLower.includes('espeto') || nameLower.includes('linguiça') || nameLower.includes('mignon') ||
            nameLower.includes('picanha') || nameLower.includes('sobrecoxa') || nameLower.includes('tábua') ||
            nameLower.includes('galeto') || nameLower.includes('bacon')) {
            destGroup = g1; // Carnes, Espetos e Resfriados
        }
        else {
            destGroup = g2; // Estoque Seco / Mercearia / Molhos / Temperos (Default)
        }

        // Apply Update
        if (destGroup !== item.group_id || newName !== item.name) {
            let logMsg = `MOVIDO: '${item.name}' para Grupo -> `;
            if (destGroup === g1) logMsg += "\"Carnes, Espetos e Resfriados\"";
            if (destGroup === g2) logMsg += "\"Estoque Seco\"";
            if (destGroup === g3) logMsg += "\"Congelados / Guarnições\"";
            if (destGroup === g4) logMsg += "\"Laticínios / Padaria\"";

            if (newName !== item.name) {
                logMsg += ` | RENOMEADO para '${newName}'`;
            }

            const { error: updErr } = await supabase.from('items').update({ group_id: destGroup, name: newName }).eq('id', item.id);
            if (updErr) console.error("Erro no update de", item.name, updErr.message);
            else console.log(logMsg);
        }
    }

    // 3. Atualizar Rotinas Ativas
    console.log("Atualizando Rotinas...");
    const { data: routines } = await supabase.from('routines').select('id');
    for (const routine of routines) {
        await supabase.from('routine_groups').delete().eq('routine_id', routine.id).eq('group_id', cozinhaGrp.id);

        for (const nG of [g1, g2, g3, g4]) {
            // Verifica se o vínculo já não existe
            const { data: exists } = await supabase.from('routine_groups').select('id').eq('routine_id', routine.id).eq('group_id', nG).maybeSingle();
            if (!exists) {
                await supabase.from('routine_groups').insert({ routine_id: routine.id, group_id: nG });
            }
        }
    }

    // 4. Desativar o grupo antigo Cozinha
    console.log("Desativando a velha 'Cozinha'...");
    await supabase.from('groups').update({ name: 'Cozinha (Descontinuado)' }).eq('id', cozinhaGrp.id);

    // 5. Ajustar PCT100 e outros nos demais Itens da base de Delivery se existir
    const { data: allItems } = await supabase.from('items').select('id, name').ilike('name', '%PCT100%');
    for (const tItem of allItems || []) {
        const fixedName = tItem.name.replace("PCT100", "PCT 100");
        await supabase.from('items').update({ name: fixedName }).eq('id', tItem.id);
        console.log(`Corrigida sigla PCT100 em: ${tItem.name}`);
    }

    console.log("Migração de Estoque concluída com sucesso!");
}

run();
