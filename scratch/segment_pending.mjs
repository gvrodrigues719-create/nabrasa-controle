import fs from 'fs'

const csvContent = fs.readFileSync('scratch/itens_para_revisao_manual.csv', 'utf8');
const lines = csvContent.split('\n').filter(l => l.trim() !== '');
const headers = lines[0].split(',');

function parseLine(line) {
    // Basic CSV parser for quoted fields
    const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    if (!parts) return null;
    return {
        id: parts[0]?.replace(/"/g, ''),
        db_name: parts[1]?.replace(/"/g, ''),
        unit: parts[2]?.replace(/"/g, ''),
        csv_name: parts[3]?.replace(/"/g, ''),
        score: parts[4]?.replace(/"/g, ''),
        price: parts[5]?.replace(/"/g, ''),
        category: parts[6]?.replace(/"/g, ''),
        affects_cmv: parts[7]?.replace(/"/g, '') === 'true',
        affects_avg_cost: parts[8]?.replace(/"/g, '') === 'true',
        observacao: parts[10]?.replace(/"/g, '')
    };
}

const items = lines.slice(1).map(parseLine).filter(Boolean);

const blocks = {
    embalagens: [],
    bebidas: [],
    limpeza: [],
    uso_consumo: [],
    cmv_alimentos: []
};

const beverageKeywords = ['coca', 'fanta', 'mate', 'stella', 'heineken', 'guarana', 'agua', 'sprit', 'suco', 'chopp', 'brahma', 'red bull', 'hocus', 'absolut', 'aperol', 'cachaça', 'vodka', 'vinho', 'licor', 'tonica', 'ice tea'];

items.forEach(item => {
    const nameLower = item.csv_name.toLowerCase();
    
    if (item.category === 'embalagem') {
        blocks.embalagens.push(item);
    } else if (item.category === 'limpeza') {
        blocks.limpeza.push(item);
    } else if (item.category === 'uso_consumo') {
        blocks.uso_consumo.push(item);
    } else if (beverageKeywords.some(k => nameLower.includes(k))) {
        blocks.bebidas.push(item);
    } else {
        blocks.cmv_alimentos.push(item);
    }
});

function generateMD(title, list, filename) {
    let md = `# Preview de Revisão: ${title}\n\n`;
    md += "| Item Sistema | Item CSV | Score | Preço Sugerido | Categoria | CMV? | Custo Médio? | ID |\n";
    md += "| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n";
    list.forEach(item => {
        md += `| ${item.db_name} | ${item.csv_name} | ${item.score} | R$ ${parseFloat(item.price).toFixed(2)} | ${item.category} | ${item.affects_cmv ? '✅' : '❌'} | ${item.affects_avg_cost ? '✅' : '❌'} | \`${item.id}\` |\n`;
    });
    fs.writeFileSync(`scratch/preview_bloco_${filename}.md`, md);
    return list.length;
}

const counts = {
    embalagens: generateMD("Embalagens", blocks.embalagens, "embalagens"),
    bebidas: generateMD("Bebidas", blocks.bebidas, "bebidas"),
    limpeza: generateMD("Limpeza", blocks.limpeza, "limpeza"),
    uso_consumo: generateMD("Uso e Consumo", blocks.uso_consumo, "uso_consumo"),
    cmv_alimentos: generateMD("Alimentos (CMV)", blocks.cmv_alimentos, "alimentos")
};

console.log("Segmentação concluída:");
console.log(JSON.stringify(counts, null, 2));
