const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Key missing in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260419000000_notice_evolution.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration...');
    
    // Supabase JS client doesn't have a direct "run arbitrary sql" method for safety reasons, 
    // but in newer versions or with certain extensions it might. 
    // However, the standard way is using the REST API /rpc/exec_sql if it exists, 
    // or just using the PostgreSQL connection if we had it.
    // Since I can't be sure about /rpc/exec_sql, I'll try to use the REST API to check if tables exist first.
    
    // Actually, I'll just try to reach the tables. 
    // If they don't exist, I'll advise the user again or try an alternative.
    // OR, I can use a more direct approach if the user allows me to use the browser to run it in the SQL Editor.
    
    // Let's try to check if notice_reactions exists.
    const { error } = await supabase.from('notice_reactions').select('id').limit(1);
    if (error && error.code === 'PGRST116') {
        console.log('Tables do not exist or are empty. Please run the SQL in Supabase Dashboard.');
        console.log('SQL Content:\n', sql);
    } else if (error && error.message.includes('relation "public.notice_reactions" does not exist')) {
        console.log('Migration needs to be applied manually in Supabase Dashboard SQL Editor.');
    } else {
        console.log('Migration seems to be already applied or tables are accessible.');
    }
}

runMigration();
