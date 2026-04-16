import fs from 'fs'

const csvContent = fs.readFileSync('scratch/itens_para_revisao_manual.csv', 'utf8');
const lines = csvContent.split('\n').filter(l => l.trim() !== '');

function parseLine(line) {
    const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    if (!parts) return null;
    return {
        id: parts[0]?.replace(/"/g, ''),
        db_name: parts[1]?.replace(/"/g, ''),
        unit: parts[2]?.replace(/"/g, ''),
        csv_name: parts[3]?.replace(/"/g, ''),
        score: parts[4]?.replace(/"/g, ''),
        price: parts[5]?.replace(/"/g, ''),
        category: parts[6]?.replace(/"/g, '')
    };
}

const items = lines.slice(1).map(parseLine).filter(Boolean);

const beverageKeywords = ['coca', 'fanta', 'mate', 'stella', 'heineken', 'guarana', 'agua', 'sprit', 'suco', 'chopp', 'brahma', 'red bull', 'hocus', 'absolut', 'aperol', 'cachaça', 'vodka', 'vinho', 'licor', 'tonica', 'ice tea'];

const beverageItems = items.filter(item => {
    const nameLower = item.csv_name.toLowerCase();
    return beverageKeywords.some(k => nameLower.includes(k));
});

function getRecommendation(csvName) {
    let rec = csvName.replace(/Cerv /i, '');
    rec = rec.replace(/GFA /i, 'Garrafa ');
    rec = rec.replace(/LN /i, 'Long Neck ');
    rec = rec.replace(/WF /i, '');
    rec = rec.replace(/PET /i, 'PET ');
    rec = rec.trim();
    return rec;
}

function getDescarteReason(dbName, csvName) {
    if (csvName.toLowerCase().includes('zero') && !dbName.toLowerCase().includes('zero')) return 'Ambiguidade Zero vs Normal';
    if (csvName.toLowerCase().includes('lata') && !dbName.toLowerCase().includes('lata')) return 'Ambiguidade Embalagem';
    return 'Diferença de nomenclatura / Volume ausente';
}

let csvOut = "item_sistema_id,item_sistema_nome,item_sistema_unidade,item_planilha_nome,average_cost_sugerido,score,motivo_descarte,average_cost_confirmado,confirmar_match,observacao,nome_recomendado_sistema\n";

beverageItems.forEach(item => {
    const recommendation = getRecommendation(item.csv_name);
    const reason = getDescarteReason(item.db_name, item.csv_name);
    
    csvOut += `"${item.id}","${item.db_name}","${item.unit}","${item.csv_name}","${item.price}","${item.score}","${reason}","","","","${recommendation}"\n`;
});

fs.writeFileSync('scratch/revisao_manual_bebidas_detalhado.csv', csvOut);
console.log(`Gerado scratch/revisao_manual_bebidas_detalhado.csv com ${beverageItems.length} itens.`);
