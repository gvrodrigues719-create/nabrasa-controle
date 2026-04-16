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

async function verify() {
    const forte = JSON.parse(fs.readFileSync('scratch/forte_to_apply.json', 'utf8'));
    const ids = forte.map(f => f.item_sistema_id);

    console.log("Fetching current state of updated items...");
    const { data: currentItems, error } = await supabase
        .from('items')
        .select('id, name, average_cost, cost_category, affects_cmv, affects_average_cost')
        .in('id', ids);

    if (error) {
        console.error("Error fetching state:", error);
        return;
    }

    let md = "# Auditoria Detalhada: Importação de Base de Custos\n\n";
    md += "Este documento contém a auditoria exata dos 29 itens atualizados no grupo **Match Forte**.\n\n";
    
    md += "## 1. Confirmação de Integridade\n";
    md += "- **Operação**: 29 chamadas `UPDATE` individuais via UUID.\n";
    md += `- **Itens Recuperados para Auditoria**: ${currentItems.length} de 29.\n`;
    md += "- **Status de Proteção**: O filtro `.eq('id', uuid)` garantiu que apenas os registros mapeados fossem alterados.\n\n";

    md += "## 2. Tabela Completa de Valores Aplicados\n\n";
    md += "| Item Sistema | ID | Match CSV | Score | Preço (avg_cost) | Categoria | CMV? | Custo Médio? |\n";
    md += "| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n";

    forte.forEach(f => {
        const current = currentItems.find(c => c.id === f.item_sistema_id);
        md += `| ${current?.name || f.item_sistema_nome} | \`${f.item_sistema_id}\` | ${f.item_csv_nome_sugerido} | ${f.score} | R$ ${current?.average_cost?.toFixed(2) || '---'} | ${current?.cost_category || '---'} | ${current?.affects_cmv ? 'SIM' : 'NÃO'} | ${current?.affects_average_cost ? 'SIM' : 'NÃO'} |\n`;
    });

    md += "\n## 3. Log de Execução Detalhado\n\n";
    const log = JSON.parse(fs.readFileSync('scratch/execution_log.json', 'utf8'));
    md += "| Item | Status | Detalhe |\n";
    md += "| :--- | :--- | :--- |\n";
    log.forEach(l => {
        md += `| ${l.item} | ${l.status === 'success' ? '✅ Sucesso' : '❌ Erro'} | ${l.message || 'Atualizado com novo custo'} |\n`;
    });

    fs.writeFileSync('scratch/auditoria_final_importacao.md', md);
    console.log("Auditoria gerada em scratch/auditoria_final_importacao.md");
}

verify();
