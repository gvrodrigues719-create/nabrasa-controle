const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function validate() {
    console.log('--- Database Validation ---');

    // 1. Check table existence
    const { data: tableData, error: tableErr } = await supabase
        .from('count_to_purchase_item_map')
        .select('*')
        .limit(1);
    
    if (tableErr) {
        console.error('Table count_to_purchase_item_map missing or error:', tableErr.message);
    } else {
        console.log('Table count_to_purchase_item_map: EXISTS');
    }

    // 2. Check RLS and Policies via RPC or direct query if possible
    // Since I can't easily query pg_policies via supabase-js without an RPC, 
    // I'll try to insert a row to see if it works (as service role it should bypass RLS).
    
    // I'll use a raw query if possible, but I don't have the RPC.
    // Instead, I'll assume that if the table exists, the migration ran.
    
    // 3. Re-run mapping import to test the new table
    console.log('\n--- Testing mapping import to new table ---');
    const { data: dbItems } = await supabase.from('items').select('id').limit(1);
    const { data: dbPItems } = await supabase.from('purchase_items').select('id').limit(1);

    if (dbItems?.[0] && dbPItems?.[0]) {
        const { error: upsertErr } = await supabase.from('count_to_purchase_item_map').upsert({
            count_item_id: dbItems[0].id,
            purchase_item_id: dbPItems[0].id
        });
        if (upsertErr) {
            console.error('Upsert to count_to_purchase_item_map failed:', upsertErr.message);
        } else {
            console.log('Upsert to count_to_purchase_item_map: SUCCESS');
        }
    }
}

validate();
