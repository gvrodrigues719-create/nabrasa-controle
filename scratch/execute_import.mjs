import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Helper to load .env.local
function loadEnv() {
    const envPath = path.resolve('.env.local');
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            env[key.trim()] = valueParts.join('=').trim();
        }
    });
    return env;
}

const env = loadEnv();
const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
);

async function execute() {
    const forte = JSON.parse(fs.readFileSync('scratch/forte_to_apply.json', 'utf8'));
    const log = [];
    const executionResults = {
        success: 0,
        errors: 0,
        total: forte.length,
        updated_items: []
    };

    console.log(`Iniciando atualização de ${forte.length} itens...`);

    for (const item of forte) {
        try {
            const { data, error } = await supabase
                .from('items')
                .update({
                    average_cost: item.average_cost_sugerido,
                    cost_category: item.cost_category_sugerida,
                    affects_cmv: item.affects_cmv_sugerido,
                    affects_average_cost: item.affects_average_cost_sugerido
                })
                .eq('id', item.item_sistema_id)
                .select('name');

            if (error) {
                console.error(`Erro ao atualizar item ${item.item_sistema_nome}:`, error.message);
                log.push({ item: item.item_sistema_nome, status: 'error', message: error.message });
                executionResults.errors++;
            } else {
                console.log(`Atualizado: ${item.item_sistema_nome} para R$ ${item.average_cost_sugerido}`);
                log.push({ item: item.item_sistema_nome, status: 'success', price: item.average_cost_sugerido });
                executionResults.success++;
                executionResults.updated_items.push(item.item_sistema_nome);
            }
        } catch (e) {
            console.error(`Exceção ao atualizar item ${item.item_sistema_nome}:`, e.message);
            log.push({ item: item.item_sistema_nome, status: 'exception', message: e.message });
            executionResults.errors++;
        }
    }

    fs.writeFileSync('scratch/execution_log.json', JSON.stringify(log, null, 2));
    
    let report = "# Relatório de Execução: Importação de Custos\n\n";
    report += `**Data**: ${new Date().toLocaleString('pt-BR')}\n`;
    report += `**Total Processado**: ${executionResults.total}\n`;
    report += `**Sucesso**: ✅ ${executionResults.success}\n`;
    report += `**Erros**: ❌ ${executionResults.errors}\n\n`;
    
    report += "## Itens Atualizados\n\n";
    report += "| Item | Preço Aplicado | Status |\n";
    report += "| :--- | :--- | :--- |\n";
    log.forEach(l => {
        report += `| ${l.item} | R$ ${l.price?.toFixed(2) || '-'} | ${l.status === 'success' ? '✅' : '❌ ' + (l.message || 'Erro')} |\n`;
    });
    
    report += "\n> [!NOTE]\n";
    report += "> Todos os updates foram filtrados estritamente pelos UUIDs do Grupo Forte. Nenhuma outra linha foi afetada.\n";

    fs.writeFileSync('scratch/execution_report.md', report);
    console.log(`Execução finalizada. Relatório em scratch/execution_report.md.`);
}

execute();
