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

async function prepare() {
    const { data: dbItems } = await supabase.from('items').select('id, name, unit');
    const csvContent = fs.readFileSync('data/base_custos_limpa_importacao.csv', 'utf8');
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

    const forte = [];
    const manualReview = [];

    const validCategories = ['cmv', 'embalagem', 'limpeza', 'uso_consumo', 'administrativo', 'imobilizado'];

    for (const csvRow of csvRows) {
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
        let mappedCategory = csvRow.category_raw;
        if (!validCategories.includes(mappedCategory)) mappedCategory = 'uso_consumo';

        const row = {
            item_sistema_id: bestMatch?.id || '---',
            item_sistema_nome: bestMatch?.name || '---',
            item_sistema_unidade: bestMatch?.unit || '---',
            item_csv_nome_sugerido: csvRow.original_name,
            score: scorePct.toFixed(1) + '%',
            average_cost_sugerido: csvRow.average_cost,
            cost_category_sugerida: mappedCategory,
            affects_cmv_sugerido: csvRow.affects_cmv,
            affects_average_cost_sugerido: csvRow.affects_avg_cost,
            acao_manual: '',
            observacao: scorePct < 80 ? 'Ignorado por score baixo' : 'Aguardando revisão manual'
        };

        if (scorePct >= 92) {
            forte.push(row);
        } else {
            manualReview.push(row);
        }
    }

    // CSV Auxiliar
    let csvOut = "item_sistema_id,item_sistema_nome,item_sistema_unidade,item_csv_nome_sugerido,score,average_cost_sugerido,cost_category_sugerida,affects_cmv_sugerido,affects_average_cost_sugerido,acao_manual,observacao\n";
    manualReview.forEach(r => {
        csvOut += `"${r.item_sistema_id}","${r.item_sistema_nome}","${r.item_sistema_unidade}","${r.item_csv_nome_sugerido}","${r.score}","${r.average_cost_sugerido}","${r.cost_category_sugerida}","${r.affects_cmv_sugerido}","${r.affects_average_cost_sugerido}","","${r.observacao}"\n`;
    });
    fs.writeFileSync('scratch/itens_para_revisao_manual.csv', csvOut);

    // Resumo Final
    const summary = {
        total_a_atualizar: forte.length,
        campo_atualizados: ['average_cost', 'cost_category', 'affects_cmv', 'affects_average_cost'],
        categorias_envolvidas: Array.from(new Set(forte.map(f => f.cost_category_sugerida))),
        itens_exemplo: forte.slice(0, 5)
    };
    fs.writeFileSync('scratch/resumo_final.json', JSON.stringify(summary, null, 2));
    fs.writeFileSync('scratch/forte_to_apply.json', JSON.stringify(forte, null, 2));

    console.log(`Preparação concluída.`);
}

prepare();
