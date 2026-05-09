
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: groups, error: gErr } = await supabase.from('groups').select('id, name').ilike('name', 'CK — %');
    if (gErr) throw gErr;

    for (const g of groups) {
        const { data: items, error: iErr } = await supabase.from('items').select('name').eq('group_id', g.id);
        if (iErr) throw iErr;
        console.log(`Group [${g.name}] has ${items?.length || 0} items:`);
        console.log(items?.map(i => i.name).join(', '));
        console.log('-------------------');
    }
}

check().catch(console.error);
