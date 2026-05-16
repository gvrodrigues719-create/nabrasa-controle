import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function findUsers() {
    const { data: users } = await supabase
        .from('users')
        .select('id, name, role, groups(name, macro_sector)')
        .in('name', ['Alan', 'Operador Teste'])
    
    console.log('Users found:', JSON.stringify(users, null, 2))

    // Find a kitchen user too
    const { data: kitchenUsers } = await supabase
        .from('users')
        .select('id, name, role, groups(name, macro_sector)')
        .eq('role', 'kitchen')
        .limit(1)
    
    console.log('Kitchen User:', JSON.stringify(kitchenUsers, null, 2))
}

findUsers()
