require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase
    .from('count_session_items')
    .select(`
        item_id, counted_quantity,
        count_sessions!inner(
            completed_at, status,
            groups!inner(name, macro_sector)
        )
    `)
    .eq('count_sessions.status', 'completed')
    .eq('count_sessions.groups.macro_sector', 'Cozinha Central')
    .limit(5);

  console.log(data, error);
}
run();
