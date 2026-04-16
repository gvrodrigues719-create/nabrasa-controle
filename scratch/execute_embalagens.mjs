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
        { id: 'bc213058-a3ac-47f9-a023-6784c3be88a3', name: 'Embalagem Isopor Carne', cost: 105.15 },
        { id: '88f7c373-0acc-4669-a121-50cb36ade646', name: 'Pote 30 ml (50)', cost: 13.90 },
        { id: 'c4d4e486-f8e0-4909-94cb-cd3fb4daf056', name: 'Pote 145 ml (25)', cost: 7.80 },
        { id: '6189df8a-a6a2-4845-9c01-3eb703898a46', name: 'Quentinha 1100ml', cost: 136.80 },
        { id: 'a91a6cd1-c9c9-4669-acfb-4962d6a8577c', name: 'Saco Delivery M', cost: 32.34 },
        { id: 'beba5fac-8281-48a3-a075-c6b45ba6c395', name: 'Saco Delivery G', cost: 44.85 },
        { id: 'c522d230-2373-461f-831b-0478d0d3c039', name: 'Saco Delivery GG', cost: 61.89 },
        { id: 'abd74641-4e61-4dea-8232-2d36208cbba1', name: 'Saladeira 1000 ml', cost: 1.44 },
        { id: 'ef2e1436-b04f-4914-8964-c42414904859', name: 'Saladeira 500 ml', cost: 1.07 }
    ];

    const log = [];
    console.log(`Iniciando atualização de ${itemsToUpdate.length} itens de Embalagens...`);

    for (const item of itemsToUpdate) {
        try {
            const { error } = await supabase
                .from('items')
                .update({
                    average_cost: item.cost,
                    cost_category: 'embalagem',
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

    fs.writeFileSync('scratch/log_embalagens_batch1.json', JSON.stringify(log, null, 2));
    console.log("Execução finalizada.");
}

execute();
