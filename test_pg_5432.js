import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import postgres from 'postgres';

const connString = process.env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', 'postgres://postgres:' + process.env.SUPABASE_SERVICE_ROLE_KEY + '@').replace('.supabase.co', '.supabase.co:5432/postgres') + '?sslmode=require';
const sql = postgres(connString);

async function run() {
    try {
        console.log("Checking users_role_check constraint via port 5432...");
        const result = await sql`SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'users_role_check'`;
        console.log(result);
    } catch(e) {
        console.error("Error:", e);
    } finally {
        await sql.end();
        process.exit(0);
    }
}
run();
