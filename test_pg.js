import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import postgres from 'postgres';

const sql = postgres(process.env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', 'postgres://postgres:' + process.env.SUPABASE_SERVICE_ROLE_KEY + '@').replace('.supabase.co', '.supabase.co:6543/postgres'));

async function run() {
    try {
        const result = await sql`SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'users_role_check'`;
        console.log(result);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
run();
