import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env.local', 'utf8')
const envs = {}
envFile.split('\n').filter(l => l.includes('=')).forEach(line => {
    const idx = line.indexOf('=')
    if (idx !== -1) {
        envs[line.substring(0, idx).trim()] = line.substring(idx + 1).trim()
    }
})

const supabaseUrl = envs.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = envs.SUPABASE_SERVICE_ROLE_KEY || envs.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    console.log("--- CONTEXTO OPERACIONAL REAL ---")
    
    // 1. Usuários
    const { data: users } = await supabase.from('users').select('id, name').limit(1)
    const testUserId = users?.[0]?.id
    const testUserName = users?.[0]?.name
    console.log(`Usuário de Teste: ${testUserName || 'Nenhum'} (${testUserId || 'N/A'})`)

    // 2. Checklists em andamento
    if (testUserId) {
        const { data: checklists } = await supabase
            .from('checklists')
            .select('title, status')
            .eq('user_id', testUserId)
            .eq('status', 'in_progress')
        
        console.log(`\nChecklists Pendentes (${checklists?.length || 0}):`)
        checklists?.forEach(c => console.log(`- ${c.title}`))
    }

    // 3. Itens em atenção
    const { data: items } = await supabase
        .from('inventory_attention_items')
        .select('item_name, reason')
        .limit(10)
    
    console.log(`\nItens em Atenção no Sistema (${items?.length || 0}):`)
    items?.forEach(i => console.log(`- ${i.item_name}: ${i.reason}`))

    // 4. FAQ
    const { data: faqRows } = await supabase.from('knowledge_faq').select('question').limit(10)
    console.log(`\nFAQ (Amplas):`)
    faqRows?.forEach(f => console.log(`- Q: ${f.question}`))
    
    console.log("\n--- FIM DO CONTEXTO ---")
}

run()
