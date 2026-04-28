const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'OK' : 'MISSING');
    const { data: users, error } = await supabase.from('users').select('*').limit(5);
    if (error) {
        console.error('Error fetching users:', error);
        return;
    }
    console.log('Users found:', users.length);
    console.log('Users Sample:', JSON.stringify(users[0], null, 2));

    const { data: groups, error: gError } = await supabase.from('groups').select('*').limit(5);
    if (gError) {
        console.error('Error fetching groups:', gError);
        return;
    }
    console.log('Groups found:', groups.length);
    console.log('Groups Sample:', JSON.stringify(groups[0], null, 2));
}

check();
