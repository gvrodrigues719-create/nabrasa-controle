import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function listUsers() {
    const { data: users } = await supabase
        .from('users')
        .select('id, name, role, groups(name, macro_sector)')
        .in('role', ['kitchen', 'admin', 'manager'])
        .limit(20)
    
    console.log('Users found:', JSON.stringify(users, null, 2))
}

listUsers()
