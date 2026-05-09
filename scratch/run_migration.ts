import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function runMigration() {
    const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20260508_kitchen_count_adjustments.sql'), 'utf8')
    const { data, error } = await supabase.rpc('exec_sql', { sql })
    if (error) {
        console.error('ERROR:', error)
        return
    }
    console.log('Migration executed successfully')
}

runMigration()
