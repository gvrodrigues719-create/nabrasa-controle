import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function listTables() {
    const { data, error } = await supabase.from('pg_tables').select('tablename').eq('schemaname', 'public')
    if (data) {
        console.log('Tables:', data.map(t => t.tablename))
    } else {
        console.log('Error listing tables:', error)
    }
}

listTables()
