import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const userId = 'b63649c8-779a-4387-b8f3-b276774c9c4a'; 
    const pin = '1234';
    
    console.log(`Verifying PIN ${pin} for user ${userId}...`);
    const { data: isValid, error } = await supabaseAdmin.rpc('verify_user_pin', { p_user_id: userId, p_pin: pin });
    
    if (error) {
        console.error("Verification Error:", error);
    } else {
        console.log("PIN is valid:", isValid);
    }
}
run();
