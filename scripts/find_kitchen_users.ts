import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function findKitchenUsers() {
    const { data: users, error } = await supabase
        .from('users')
        .select('id, name, role, groups!inner(name, macro_sector)')
        .eq('groups.macro_sector', 'Cozinha Central')
    
    if (error) {
        console.error('Error:', error)
        return
    }
    console.log('Kitchen Users:', JSON.stringify(users, null, 2))
}

findKitchenUsers()
