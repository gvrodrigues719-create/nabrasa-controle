const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const { data: users, error } = await supabase.from('users').select('id, name, role, primary_group_id');
    console.log('Users:', JSON.stringify(users, null, 2));

    const { data: groups, error: gError } = await supabase.from('groups').select('*');
    if (gError) console.error('Groups Error:', gError);
    console.log('Groups Data:', JSON.stringify(groups, null, 2));
}

check();
