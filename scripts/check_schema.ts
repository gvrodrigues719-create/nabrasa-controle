import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkSchema() {
    const { data, error } = await supabase.from('users').select('*').limit(1)
    if (data && data[0]) {
        console.log('Users columns:', Object.keys(data[0]))
    } else {
        console.log('No users found or error:', error)
    }
}

checkSchema()
