import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function run() {
    const { data: groups } = await supabase.from('groups').select('id, name').order('name');
    const { data: items } = await supabase.from('items').select('id, name, unit, group_id').order('name');

    const mapped = groups.map(g => {
        const groupItems = items.filter(i => i.group_id === g.id);
        return {
            group: g.name,
            itemCount: groupItems.length,
            items: groupItems.map(i => `${i.name} (${i.unit})`)
        }
    })

    console.log(JSON.stringify(mapped, null, 2));
}

run();
