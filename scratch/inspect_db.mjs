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
    console.log("Analyzing Database tables via REST API using standard RPC or table reflection...")
    
    // Unfortunately, Supabase REST API doesn't expose system schemas directly like `information_schema.tables` without RPC.
    // Let's try to query our new copilot tables to see what exists.
    const tablesToCheck = [
        'knowledge_documents',
        'knowledge_chunks',
        'knowledge_faq',
        'copilot_conversations',
        'copilot_messages',
        'copilot_feedback'
    ]

    for (const tableName of tablesToCheck) {
        const { data, error } = await supabase.from(tableName).select('*').limit(1)
        if (error) {
            console.log(`[ ] Table '${tableName}': ERROR (${error.code || error.message})`)
        } else {
            console.log(`[X] Table '${tableName}': EXISTS (Has ${data.length} rows loaded locally)`)
        }
    }
    
    console.log("\nChecking FAQ content if it exists:")
    const { data: faqRows, error: faqErr } = await supabase.from('knowledge_faq').select('*')
    if (faqRows && faqRows.length > 0) {
        console.log(`Knowledge FAQ has ${faqRows.length} items.`)
        faqRows.forEach(row => console.log(` - Q: ${row.question}`))
    } else if (faqRows?.length === 0) {
        console.log("Knowledge FAQ exists but is empty.")
    } else {
        console.log("Could not read FAQ.")
    }
}

run()
