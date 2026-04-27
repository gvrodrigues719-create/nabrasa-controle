import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import postgres from 'postgres';
import crypto from 'crypto';

const connString = process.env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', 'postgres://postgres:' + process.env.SUPABASE_SERVICE_ROLE_KEY + '@').replace('.supabase.co', '.supabase.co:6543/postgres') + '?sslmode=require';
const sql = postgres(connString);

async function run() {
    try {
        console.log("Modifying users_role_check constraint to include 'kitchen'...");
        await sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`;
        await sql`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'manager', 'operator', 'kitchen', 'maintenance'))`;
        console.log("Constraint updated successfully.");

        console.log("Creating user Cozinha Central with role kitchen...");
        
        // Let's create an auth user if not exists
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        let userId = null;
        const email = 'cozinha.central@nabrasa.com.br';
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
        let existingUser = usersData.users.find(u => u.email === email);
        
        if (!existingUser) {
            const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password: 'nabrasakitchen2026',
                email_confirm: true
            });
            if (authError) {
                console.error("Auth error:", authError);
            } else {
                userId = authUser.user.id;
            }
        } else {
            userId = existingUser.id;
        }

        if (userId) {
            // Update users table
            await new Promise(r => setTimeout(r, 1000));
            
            await sql`
                UPDATE users 
                SET role = 'kitchen', 
                    name = 'Cozinha Central',
                    pin_hash = crypt('1234', gen_salt('bf'))
                WHERE id = ${userId}
            `;
            console.log("Kitchen user profile updated with PIN '1234'.");
        }

    } catch(e) {
        console.error("Error:", e);
    } finally {
        await sql.end();
        process.exit(0);
    }
}
run();
