const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    try {
        const { data: items, error: err1 } = await supabase.from('items').select('id, name').limit(20);
        const { data: purchaseItems, error: err2 } = await supabase.from('purchase_items').select('id, name').limit(20);
        
        if (err1) console.error('Error fetching items:', err1);
        if (err2) console.error('Error fetching purchase_items:', err2);

        console.log('--- ITEMS ---');
        console.log(JSON.stringify(items, null, 2));
        console.log('--- PURCHASE ITEMS ---');
        console.log(JSON.stringify(purchaseItems, null, 2));
    } catch (e) {
        console.error(e);
    }
}

check();
