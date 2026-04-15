import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debug() {
    console.log('--- Routine Executions Columns ---')
    const { data: cols } = await supabase.rpc('get_columns', { table_name: 'routine_executions' })
    if (cols) {
        console.table(cols)
    } else {
        // Fallback: query a single row to see keys
        const { data: row } = await supabase.from('routine_executions').select('*').limit(1).single()
        if (row) {
            console.log(Object.keys(row))
        }
    }

    console.log('\n--- Count of cycles ---')
    const { count } = await supabase.from('routine_executions').select('*', { count: 'exact', head: true })
    console.log('Total executions:', count)
}

debug()
