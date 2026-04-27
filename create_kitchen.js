import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("Creating Kitchen Central access...");
    
    // Create Supabase Auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: 'cozinha.central@nabrasa.com.br',
        password: 'nabrasakitchen2026',
        email_confirm: true
    });

    if (authError) {
        console.log("Auth Error (maybe user already exists):", authError.message);
    }

    const userId = authUser?.user?.id;
    if (!userId) {
        console.log("No user ID found, attempting to fetch existing user.");
        const { data: users } = await supabaseAdmin.from('users').select('id, name').eq('email', 'cozinha.central@nabrasa.com.br');
        if (users && users.length > 0) {
            console.log("Existing user found:", users[0]);
        }
        return;
    }

    // Now insert into users table if needed (Trigger usually does this, but we update the role and pin)
    // We will update the pin_hash manually. We don't hash it properly here, but NaBrasa Controle pin uses simple hash or stores plain if it's demo?
    // Wait, the PIN auth usually compares a hash. Let's just create an operator profile.
    
    // We need to wait a second for the trigger to insert the user profile
    await new Promise(r => setTimeout(r, 2000));

    const { error: updateError } = await supabaseAdmin.from('users').update({
        role: 'kitchen',
        name: 'Cozinha Central'
    }).eq('id', userId);

    if (updateError) {
        console.log("Update profile error:", updateError);
    } else {
        console.log("Kitchen Central profile updated successfully!");
        console.log("Email: cozinha.central@nabrasa.com.br");
        console.log("Password: nabrasakitchen2026");
    }
}

run();
