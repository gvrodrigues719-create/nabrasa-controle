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
    console.log("Fetching items from DB...");
    const { data: dbItems, error } = await supabase.from('items').select('id, name, unit');
    if (error) {
        console.error('Error fetching items:', error);
        return;
    }

    console.log(`Loading CSV - Found ${dbItems.length} items in DB.`);
    const csvPath = 'data/base_custos_limpa_importacao.csv';
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(l => l.trim() !== '');
    
    const csvRows = lines.slice(1).map(line => {
        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        return {
            original_name: parts[1]?.replace(/"/g, ''),
            average_cost: parseFloat(parts[4]),
            category: parts[5],
            affects_cmv: parts[6]?.toLowerCase() === 'true',
            affects_avg_cost: parts[7]?.toLowerCase() === 'true',
            status_preco: parts[8]
        };
    });

    let md = "# Preview de Importação de Custos\n\n";
    md += "| Item Planilha | Item Sistema | Confiança | Preço Sugerido | Categoria | CMV? | Custo Médio? | ID |\n";
    md += "| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n";

    let highConfidenceCount = 0;
    let totalValid = 0;

    for (const csvRow of csvRows) {
        if (!csvRow.original_name || isNaN(csvRow.average_cost) || csvRow.status_preco !== 'OK') continue;
        totalValid++;

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
        if (scorePct >= 85) highConfidenceCount++;

        const riskEmoji = scorePct < 85 ? "⚠️ " : "✅ ";
        
        md += `| ${csvRow.original_name} | ${bestMatch?.name || 'N/A'} | ${riskEmoji}${scorePct.toFixed(1)}% | R$ ${csvRow.average_cost.toFixed(2)} | ${csvRow.category} | ${csvRow.affects_cmv ? 'Sim' : 'Não'} | ${csvRow.affects_avg_cost ? 'Sim' : 'Não'} | ${bestMatch?.id || '-'} |\n`;
    }

    fs.writeFileSync('scratch/preview_importacao.md', md);
    console.log(`Preview generated at scratch/preview_importacao.md.`);
    console.log(`Summary: ${totalValid} valid items analyzed. ${highConfidenceCount} with high confidence (>=85%).`);
}

runAnalysis();
