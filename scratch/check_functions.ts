import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function listFunctions() {
    const { data, error } = await supabase.rpc('get_functions')
    if (error) {
        console.error('ERROR:', error)
        return
    }
    console.log('FUNCTIONS:', JSON.stringify(data, null, 2))
}

listFunctions()
