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

let csvOut = "id_sistema,item_sistema,item_csv_sugerido,score,preco_csv,custo_final_manual,observacao\n";
beverageItems.forEach(item => {
    csvOut += `"${item.id}","${item.db_name}","${item.csv_name}","${item.score}","${item.price}","","REVISAR VOLUME/MARCA"\n`;
});

fs.writeFileSync('scratch/revisao_manual_bebidas.csv', csvOut);
console.log(`Gerado scratch/revisao_manual_bebidas.csv com ${beverageItems.length} itens.`);
