import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function findAdmin() {
    const { data: users } = await supabase
        .from('users')
        .select('id, name, role')
        .eq('role', 'admin')
        .limit(5)
    
    console.log('Admins:', JSON.stringify(users, null, 2))
}

findAdmin()
