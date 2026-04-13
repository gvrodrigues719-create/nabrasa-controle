import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import Papa from 'papaparse'

// Carregando env
const envFile = fs.readFileSync('.env.local', 'utf8')
const envs = {}
envFile.split('\n').filter(l => l.includes('=')).forEach(line => {
    const idx = line.indexOf('=')
    if (idx !== -1) {
        envs[line.substring(0, idx).trim()] = line.substring(idx + 1).trim()
    }
})

// Chave. Se a anon for usada em vez de service_role_key, esbarraremos no RLS do Auth.
const supabaseUrl = envs.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = envs.SUPABASE_SERVICE_ROLE_KEY || envs.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

const mandatoryGroups = [
    { name: 'Cozinha', macro_sector: 'Operação', description: 'Itens de cozinha e produção', order_index: 1, active: true },
    { name: 'Salão', macro_sector: 'Atendimento', description: 'Itens de bar e salão', order_index: 2, active: true },
    { name: 'Hortifruti', macro_sector: 'Suprimentos', description: 'Itens de hortifruti', order_index: 3, active: true },
    { name: 'Delivery e Embalagens', macro_sector: 'Delivery', description: 'Itens de embalagens e apoio do delivery', order_index: 4, active: true },
    { name: 'Operacional e Limpeza', macro_sector: 'Operação', description: 'Itens operacionais, limpeza e papelaria', order_index: 5, active: true }
]

async function run() {
    console.log("Iniciando rotina de carga...")
    let report = { gruposCriados: 0, gruposExistentes: 0, itensInseridos: 0, itensAtualizados: 0, falhas: 0, detalhesFalhas: [], blockerType: null }

    // Teste de leitura de Grupos. Falhar aqui prova RLS ativa se for token Anon vázio ou sem permissão.
    const { data: existingGroups, error: grpErr } = await supabase.from('groups').select('*')
    if (grpErr) {
        console.error("⛔ BLOQUEIO TÉCNICO DETECTADO: RLS Access Denied.")
        report.blockerType = "RLS_MANAGER_OR_ADMIN_REQUIRED"
        report.detalhesFalhas.push("Bloqueio de inserção! O token usado não é Adm. Cole SUPABASE_SERVICE_ROLE_KEY no env.local para liberar a importação automatizada.")
        console.log(JSON.stringify(report, null, 2))
        return
    }

    // 0. Limpeza Prévia
    await supabase.from('items').delete().like('code', 'ZZ_TESTE_%')
    await supabase.from('groups').delete().like('name', 'ZZ_TESTE_%')

    // 1. Resolver Inserção/Validação de Grupos
    const groupMap = {}
    for (let mg of mandatoryGroups) {
        let found = existingGroups.find(eg => eg.name === mg.name)
        if (found) {
            report.gruposExistentes++
            groupMap[found.name] = found.id
        } else {
            console.log("Inserindo grupo:", mg.name)
            const { data: ng, error: iErr } = await supabase.from('groups').insert([mg]).select().single()
            if (iErr) {
                console.error("Erro inserindo grupo", iErr)
                if (iErr.code === '42501') {
                    // 42501 = RLS denied
                    report.blockerType = "NEW_ROW_VIOLATES_RLS"
                }
            } else {
                report.gruposCriados++
                groupMap[ng.name] = ng.id
            }
        }
    }

    if (report.blockerType) {
        console.log("Abortando devido a falha RLS em nova inserção de dependência.")
        console.log(JSON.stringify(report, null, 2))
        return
    }

    // 2. CSV Parse
    const csvFile = fs.readFileSync('mapeamento_final_itens_nabrasa.csv', 'utf8')
    const results = Papa.parse(csvFile, { header: true, skipEmptyLines: true })

    // 3. Upsert Logic 
    const { data: existingItems } = await supabase.from('items').select('id, code, name')

    for (let row of results.data) {
        const item_id = row.item_id
        if (!item_id) continue;

        const grupoFinal = row.grupo_final
        const groupId = groupMap[grupoFinal]

        if (!groupId) {
            report.falhas++
            report.detalhesFalhas.push(`Ignorado: ${row.nome_item} | Grupo '${grupoFinal}' desconhecido.`)
            continue;
        }

        const itemRecord = {
            code: item_id,
            name: row.nome_item,
            unit: row.unidade,
            unit_observation: row.observacao_unidade,
            average_cost: 0,
            active: row.ativo?.toLowerCase() === 'sim',
            group_id: groupId
        }

        const existing = existingItems?.find(ei => ei.code === item_id)
        if (existing) {
            // Atualizar
            const { error: updErr } = await supabase.from('items').update(itemRecord).eq('code', item_id)
            if (updErr) {
                report.falhas++;
                report.detalhesFalhas.push(`${item_id} Update: ${updErr.message}`)
            }
            else report.itensAtualizados++
        } else {
            // Inserir
            const { error: insErr } = await supabase.from('items').insert([itemRecord])
            if (insErr) {
                report.falhas++;
                report.detalhesFalhas.push(`${item_id} Insert: ${insErr.message}`)
            }
            else report.itensInseridos++
        }
    }

    console.log("\n=== RELATÓRIO OFICIAL DE IMPORTAÇÃO ===")
    console.log(JSON.stringify(report, null, 2))
}

run()
