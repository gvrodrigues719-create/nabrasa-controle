import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkGroups() {
    const { data, error } = await supabase.from('groups').select('name, id').eq('macro_sector', 'Cozinha Central')
    if (error) {
        console.error('ERROR:', error)
        return
    }
    console.log('GROUPS:', JSON.stringify(data, null, 2))
}

checkGroups()
