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
        { id: '17c8b28d-cde9-4118-ad91-a81e0113ba41', name: 'Esponja 3M Dupla Face', cost: 11.80 },
        { id: 'c8e7a139-9259-4421-9c47-bf58a4d63634', name: 'Álcool Líquido 70%', cost: 5.98 },
        { id: 'e99c56f6-1b52-41be-a844-abf09b2282a6', name: 'Detergente 500ml Odd Neutro', cost: 9.20 }
    ];

    const log = [];
    console.log(`Iniciando atualização de ${itemsToUpdate.length} itens de Limpeza...`);

    for (const item of itemsToUpdate) {
        try {
            const { error } = await supabase
                .from('items')
                .update({
                    average_cost: item.cost,
                    cost_category: 'limpeza',
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

    fs.writeFileSync('scratch/log_limpeza_batch1.json', JSON.stringify(log, null, 2));
    console.log("Execução finalizada.");
}

execute();
