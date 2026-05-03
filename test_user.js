import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: users } = await supabase.from('users').select('id, name, unit_id, primary_group_id').eq('name', 'Guilherme Gerente');
    console.log("Users:", users);

    const { data: groups } = await supabase.from('groups').select('*').limit(10);
    console.log("Groups:", groups);
}

run();
