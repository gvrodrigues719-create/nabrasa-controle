import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const userId = 'b63649c8-779a-4387-b8f3-b276774c9c4a'; // Cozinha Central ID
    const pin = '1234';
    
    console.log(`Setting PIN ${pin} for user ${userId} using RPC...`);
    const { error } = await supabaseAdmin.rpc('admin_set_user_pin', { p_user_id: userId, p_pin: pin });
    
    if (error) {
        console.error("RPC Error:", error);
    } else {
        console.log("PIN set successfully!");
    }
}
run();
