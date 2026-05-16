import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkRLS() {
    console.log('--- Checking RLS Status ---')
    const tables = ['ck_receivings', 'ck_receiving_items', 'ck_receiving_events', 'ck_receiving_catalog_items']
    
    for (const table of tables) {
        const { data, error } = await supabase.rpc('get_policies', { table_name: table })
        // Since get_policies might not exist, we can query pg_policies directly via RPC if available, 
        // or just try to check if RLS is enabled via a raw query if possible.
        // Alternatively, we can use the information_schema via a standard select if we have permissions.
        
        const { data: rlsStatus, error: rlsErr } = await supabase.rpc('check_rl_enabled', { t_name: table })
        // If RPCs are not available, we can't easily check RLS status via the standard JS client without SQL.
        // But we can try to query pg_catalog.pg_class if we have a way to run raw SQL.
    }

    // Best way to check if RLS is on: try to query as a non-admin if possible? 
    // No, easier to check the schema via SQL.
    
    const { data: policies, error: polErr } = await supabase.from('pg_policies').select('*').in('tablename', tables)
    // Wait, pg_policies is a view, usually readable.
    
    console.log('Policies found:', policies)
    if (polErr) console.error('Error fetching policies:', polErr)
}

async function findTestUsers() {
    console.log('\n--- Finding Test Users ---')
    const { data: users, error } = await supabase
        .from('users')
        .select('id, name, role, pin, groups(name, macro_sector)')
        .in('name', ['Alan', 'Operador Teste'])
    
    if (error) {
        console.error('Error fetching users:', error)
        return
    }

    console.log('Test Users:', JSON.stringify(users, null, 2))

    // Also find a kitchen operator
    const { data: kitchenUsers } = await supabase
        .from('users')
        .select('id, name, role, pin, groups(name, macro_sector)')
        .eq('role', 'kitchen')
        .limit(3)
    
    console.log('Kitchen Users:', JSON.stringify(kitchenUsers, null, 2))
}

async function main() {
    await findTestUsers()
}

main()
