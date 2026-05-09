
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: tables, error } = await supabase
        .from('pg_catalog.pg_tables')
        .select('tablename')
        .eq('schemaname', 'public');
    
    if (error) {
        console.error('Error fetching tables:', error);
        return;
    }
    console.log('Tables:', JSON.stringify(tables, null, 2));
}

check().catch(console.error);
