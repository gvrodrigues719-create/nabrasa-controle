import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function listTables() {
    const { data, error } = await supabase.rpc('get_tables')
    if (error) {
        // Fallback to a direct query if get_tables RPC doesn't exist
        const { data: tables, error: queryError } = await supabase.from('pg_catalog.pg_tables').select('tablename').eq('schemaname', 'public')
        if (queryError) {
             console.error('ERROR:', queryError)
             return
        }
        console.log('TABLES:', tables.map(t => t.tablename))
    } else {
        console.log('TABLES:', data)
    }
}

listTables()
