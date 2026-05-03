import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    // We want to link Guilherme Gerente to a valid unit.
    // Let's see what groups exist that could act as a unit.
    const { data: groups } = await supabase.from('groups').select('*');
    let camboinhasGroup = groups.find(g => g.name === 'NaBrasa Camboinhas');
    
    if (!camboinhasGroup) {
        const { data: newGroup, error } = await supabase.from('groups').insert({
            name: 'NaBrasa Camboinhas',
            description: 'Unidade principal',
            active: true
        }).select('*').single();
        if (error) console.error(error);
        camboinhasGroup = newGroup;
        console.log('Created unit:', camboinhasGroup.name);
    } else {
        console.log('Found unit:', camboinhasGroup.name);
    }

    const { data: user, error: userError } = await supabase.from('users').update({
        unit_id: camboinhasGroup.id
    }).eq('name', 'Guilherme Gerente').select('name, unit_id').single();
    
    if (userError) console.error(userError);
    console.log('Updated user:', user);
}
run();
