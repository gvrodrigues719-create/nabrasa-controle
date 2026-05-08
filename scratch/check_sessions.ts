import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function checkSessions() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const routineId = '71bee6e1-5869-413f-9b23-be3d6fdb2e9d'
    const groupId = '2005d949-ed0d-4289-8c4e-03890509fa74'

    const { data, error } = await supabase.from('count_sessions').select('*').eq('routine_id', routineId).eq('group_id', groupId)
    
    if (error) {
        console.error('ERROR:', error)
        return
    }
    
    console.log('SESSIONS FOUND:', JSON.stringify(data, null, 2))
}

checkSessions()
