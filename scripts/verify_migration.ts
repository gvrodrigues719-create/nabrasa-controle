import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verifyMigration() {
    const tables = ['ck_receivings', 'ck_receiving_items', 'ck_receiving_events', 'ck_receiving_catalog_items']
    
    // We can use a raw SQL query via RPC if it exists, or try to check if RLS is enabled on these tables.
    // Let's try to query public info about RLS.
    // Actually, we can check if the 'admin_kitchen_all' policy exists on these tables.
    
    console.log('Checking RLS policies...')
    for (const table of tables) {
        const { data, error } = await supabase.from('pg_policies').select('*').eq('tablename', table)
        if (data && data.length > 0) {
            console.log(`Table ${table} has policies:`, data.map(p => p.policyname))
        } else {
            console.log(`Table ${table} has NO policies (or error):`, error?.message || 'Empty')
        }
    }
}

verifyMigration()
