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
    const itemsToUpdate = [
        { id: '125bc89e-51dc-45da-8f55-52cdb19a14cc', name: 'Bobina Picote 30x40 Rolo 1,71kg', cost: 6.60 },
        { id: '6e9b81db-e19e-4e0f-aa3a-b3d6ecf1c8f7', name: 'Bobina Picote 40x60 Rolo 2,36kg', cost: 12.31 },
        { id: '23769627-941c-4982-90a8-170e29cc3ae7', name: 'Sachê Sal ITA PCT 100', cost: 21.48 }
    ];

    const log = [];
    console.log(`Iniciando atualização de ${itemsToUpdate.length} itens de Uso e Consumo...`);

    for (const item of itemsToUpdate) {
        try {
            const { error } = await supabase
                .from('items')
                .update({
                    average_cost: item.cost,
                    cost_category: 'uso_consumo',
                    affects_cmv: false,
                    affects_average_cost: false
                })
                .eq('id', item.id);

            if (error) {
                console.error(`Erro ao atualizar ${item.name}:`, error.message);
                log.push({ item: item.name, id: item.id, status: 'error', message: error.message });
            } else {
                console.log(`Sucesso: ${item.name} -> R$ ${item.cost}`);
                log.push({ item: item.name, id: item.id, status: 'success', price: item.cost });
            }
        } catch (e) {
            console.error(`Exceção em ${item.name}:`, e.message);
            log.push({ item: item.name, id: item.id, status: 'exception', message: e.message });
        }
    }

    fs.writeFileSync('scratch/log_uso_consumo_batch1.json', JSON.stringify(log, null, 2));
    console.log("Execução finalizada.");
}

execute();
