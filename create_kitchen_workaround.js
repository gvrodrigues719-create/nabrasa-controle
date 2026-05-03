import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const email = 'cozinha.central@nabrasa.com.br';
    const password = 'nabrasakitchen2026';
    
    console.log("Checking if auth user exists...");
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    let authUser = usersData.users.find(u => u.email === email);
    
    if (!authUser) {
        console.log("Creating auth user...");
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });
        if (error) {
            console.error("Auth error:", error);
            return;
        }
        authUser = data.user;
    }
    
    console.log("User ID:", authUser.id);
    
    // Wait for trigger
    await new Promise(r => setTimeout(r, 2000));
    
    console.log("Updating user profile with 'operator' role (workaround)...");
    const { error: updateError } = await supabaseAdmin.from('users').update({
        role: 'operator',
        name: 'Cozinha Central'
    }).eq('id', authUser.id);
    
    if (updateError) {
        console.error("Update error:", updateError);
    } else {
        console.log("Profile updated successfully!");
    }
}
run();
