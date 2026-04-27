const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

const CATEGORY_TO_GROUP = {
    'BEBIDAS': 'Bar (Bebidas)',
    'DESTILADOS E VINHOS': 'Bar (Bebidas)',
    
    'PROTEÍNAS': 'Carnes, Espetos e Resfriados',
    'ESPETOS': 'Carnes, Espetos e Resfriados',
    
    'CONGELADOS': 'Congelados / Guarnições',
    'ENTRADAS': 'Congelados / Guarnições',
    'LANCHES': 'Congelados / Guarnições',
    
    'DESCARTÁVEIS': 'Delivery e Embalagens',
    
    'MERCEARIA': 'Estoque Seco / Mercearia / Molhos / Temperos',
    'COZINHA CENTRAL - BASES': 'Estoque Seco / Mercearia / Molhos / Temperos',
    'COZINHA CENTRAL - MOLHOS': 'Estoque Seco / Mercearia / Molhos / Temperos',
    'CONDIMENTOS': 'Estoque Seco / Mercearia / Molhos / Temperos',
    'TEMPEROS': 'Estoque Seco / Mercearia / Molhos / Temperos',
    
    'HORTIFRUTI': 'Hortifruti',
    
    'LATICÍNIOS E OVOS': 'Laticínios / Padaria / Sobremesas',
    'SOBREMESAS': 'Laticínios / Padaria / Sobremesas',
    
    'LIMPEZA': 'Operacional e Limpeza',
    'INSUMOS OPERACIONAIS': 'Operacional e Limpeza',
    
    'FUNCIONÁRIO': 'Refeição Funcionários',
}

async function run() {
    console.log('--- Iniciando Sincronização de Itens ---')

    // 1. Carregar Grupos
    const { data: groups, error: errGroups } = await supabase.from('groups').select('id, name')
    if (errGroups) return console.error('Erro ao buscar groups', errGroups)
    
    const groupNameToId = {}
    groups.forEach(g => { groupNameToId[g.name] = g.id })

    // 2. Carregar Purchase Items
    const { data: pItems, error: errPItems } = await supabase
        .from('purchase_items')
        .select('*')
        .eq('is_active', true)
    
    if (errPItems) return console.error('Erro ao buscar purchase_items', errPItems)

    console.log(`Encontrados ${pItems.length} itens ativos no catálogo de compras.`)

    // 3. Desativar itens antigos
    const { data: oldItems, error: errOld } = await supabase
        .from('items')
        .select('id')
        .eq('active', true)
    
    if (errOld) return console.error('Erro ao buscar itens ativos', errOld)

    if (oldItems.length > 0) {
        console.log(`Desativando ${oldItems.length} itens antigos de contagem...`)
        const { error: errUpdateOld } = await supabase
            .from('items')
            .update({ active: false })
            .in('id', oldItems.map(i => i.id))
        if (errUpdateOld) return console.error('Erro ao desativar itens', errUpdateOld)
    }

    // 4. Buscar todos os itens existentes (incluindo inativos) para fazer upsert lógico
    const { data: allItems, error: errAll } = await supabase
        .from('items')
        .select('id, name, group_id')
    
    if (errAll) return console.error('Erro ao buscar todos os itens', errAll)

    const existingItemsMap = new Map() // key: name + group_id, value: id
    allItems.forEach(i => {
        existingItemsMap.set(`${i.name}_${i.group_id}`, i.id)
    })

    let createdCount = 0
    let updatedCount = 0
    let ignoredCount = 0

    // 5. Inserir / Atualizar itens
    for (const p of pItems) {
        const targetGroupName = CATEGORY_TO_GROUP[p.category]
        if (!targetGroupName) {
            console.log(`Ignorando: Categoria "${p.category}" não encontrou grupo de destino. (Item: ${p.name})`)
            ignoredCount++
            continue
        }

        const groupId = groupNameToId[targetGroupName]
        if (!groupId) {
            console.log(`Ignorando: Grupo "${targetGroupName}" mapeado não existe no banco! (Item: ${p.name})`)
            ignoredCount++
            continue
        }

        let unit = p.count_unit || p.order_unit
        if (!unit) {
            unit = p.category === 'FUNCIONÁRIO' ? 'kg' : 'un'
        }

        const itemPayload = {
            name: p.name,
            group_id: groupId,
            unit: unit,
            min_expected: p.min_stock || null,
            max_expected: p.max_stock || null,
            active: true
        }

        const mapKey = `${p.name}_${groupId}`
        const existingId = existingItemsMap.get(mapKey)

        if (existingId) {
            // Update
            const { error: updateErr } = await supabase
                .from('items')
                .update(itemPayload)
                .eq('id', existingId)
            
            if (updateErr) {
                console.error(`Erro ao atualizar item ${p.name}`, updateErr)
            } else {
                updatedCount++
            }
        } else {
            // Insert
            const { error: insertErr } = await supabase
                .from('items')
                .insert(itemPayload)
            
            if (insertErr) {
                console.error(`Erro ao inserir item ${p.name}`, insertErr)
            } else {
                createdCount++
            }
        }
    }

    console.log('\n--- Relatório Final ---')
    console.log(`Itens antigos desativados: ${oldItems.length}`)
    console.log(`Novos itens criados: ${createdCount}`)
    console.log(`Itens reativados/atualizados: ${updatedCount}`)
    console.log(`Itens ignorados (sem categoria map/grupo): ${ignoredCount}`)
}

run()
