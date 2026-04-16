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

// Dice Coefficient similarity
function stringSimilarity(str1, str2) {
    const normalize = (s) => s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ');
    const s1 = normalize(str1);
    const s2 = normalize(str2);
    
    if (s1 === s2) return 1.0;
    if (s1.length < 2 || s2.length < 2) return 0;

    const bigrams1 = new Set();
    for (let i = 0; i < s1.length - 1; i++) bigrams1.add(s1.substring(i, i + 2));
    const bigrams2 = new Set();
    for (let i = 0; i < s2.length - 1; i++) bigrams2.add(s2.substring(i, i + 2));

    let intersect = 0;
    for (const b of bigrams1) if (bigrams2.has(b)) intersect++;

    return (2 * intersect) / (bigrams1.size + bigrams2.size);
}

async function runAnalysis() {
    console.log("Iniciando análise para Preview...");
    const { data: dbItems, error } = await supabase.from('items').select('id, name, unit');
    if (error) {
        console.error('Erro ao buscar itens do banco:', error);
        return;
    }

    const csvPath = 'data/base_custos_limpa_importacao.csv';
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(l => l.trim() !== '');
    
    const csvRows = lines.slice(1).map(line => {
        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        return {
            original_name: parts[1]?.replace(/"/g, '').trim(),
            average_cost: parseFloat(parts[4]),
            category_raw: parts[5]?.trim().toLowerCase(),
            affects_cmv: parts[6]?.trim().toLowerCase() === 'true',
            affects_avg_cost: parts[7]?.trim().toLowerCase() === 'true',
            status_preco: parts[8]?.trim()
        };
    });

    const groups = {
        forte: [],
        revisar: [],
        ignorado: []
    };

    const validCategories = ['cmv', 'embalagem', 'limpeza', 'uso_consumo', 'administrativo', 'imobilizado'];

    for (const csvRow of csvRows) {
        // Regra 4: Pular itens sem preço ou preço 0
        if (!csvRow.original_name || isNaN(csvRow.average_cost) || csvRow.average_cost <= 0 || csvRow.status_preco !== 'OK') continue;

        let bestMatch = null;
        let bestScore = 0;

        for (const dbItem of dbItems) {
            const score = stringSimilarity(csvRow.original_name, dbItem.name);
            if (score > bestScore) {
                bestScore = score;
                bestMatch = dbItem;
            }
        }

        const scorePct = (bestScore * 100);
        
        // Mapeamento de Categoria (Regra 3)
        let mappedCategory = csvRow.category_raw;
        if (!validCategories.includes(mappedCategory)) {
            mappedCategory = 'uso_consumo'; // Fallback seguro
        }

        const matchResult = {
            csv_name: csvRow.original_name,
            db_name: bestMatch?.name || '---',
            db_id: bestMatch?.id || '---',
            score: scorePct.toFixed(1) + '%',
            price: csvRow.average_cost,
            category: mappedCategory,
            affects_cmv: csvRow.affects_cmv,
            affects_avg_cost: csvRow.affects_avg_cost
        };

        // Enquadramento de Grupos (Regra 1)
        if (scorePct >= 92) {
            groups.forte.push(matchResult);
        } else if (scorePct >= 80) {
            groups.revisar.push(matchResult);
        } else {
            groups.ignorado.push(matchResult);
        }
    }

    // Gerar Markdown
    let md = "# Preview Final: Importação de Base de Custos\n\n";
    md += "> [!IMPORTANT]\n";
    md += "> **Score >= 92%**: Match Forte (F)\n";
    md += "> **Score 80-91%**: Revisão Manual (R)\n";
    md += "> **Score < 80%**: Ignorado (I)\n\n";

    const renderTable = (title, list, emoji) => {
        let section = `## ${emoji} ${title} (${list.length} itens)\n\n`;
        section += "| Item Sistema | Item CSV | Score | Preço | Categoria | CMV? | Custo Médio? | ID |\n";
        section += "| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n";
        list.forEach(item => {
            section += `| ${item.db_name} | ${item.csv_name} | ${item.score} | R$ ${item.price.toFixed(2)} | ${item.category} | ${item.affects_cmv ? '✅' : '❌'} | ${item.affects_avg_cost ? '✅' : '❌'} | \`${item.db_id}\` |\n`;
        });
        return section + "\n";
    };

    md += renderTable("Grupo: MATCH FORTE", groups.forte, "🟢");
    md += renderTable("Grupo: REVISÃO MANUAL", groups.revisar, "🟡");
    md += renderTable("Grupo: IGNORADO", groups.ignorado, "🔴");

    fs.writeFileSync('scratch/preview_custos_final.md', md);
    console.log(`Preview gerado em scratch/preview_custos_final.md com sucesso.`);
    console.log(`Forte: ${groups.forte.length} | Revisar: ${groups.revisar.length} | Ignorado: ${groups.ignorado.length}`);
}

runAnalysis();
