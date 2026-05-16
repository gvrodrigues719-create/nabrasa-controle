import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function debugUsers() {
    const { data: users } = await supabase
        .from('users')
        .select('id, name, role')
    
    const roles = [...new Set(users?.map(u => u.role))]
    console.log('Unique Roles:', roles)
    
    const adminLike = users?.filter(u => u.name.toLowerCase().includes('admin') || u.role.toLowerCase().includes('admin'))
    console.log('Admin-like users:', adminLike)
}

debugUsers()
