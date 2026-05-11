require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testFetch() {
    const { data: countData, error } = await supabase
        .from('count_session_items')
        .select(`
            item_id, counted_quantity, is_zeroed, validated_quantity, validated_is_zeroed,
            count_sessions!inner(completed_at, status)
        `)
        .eq('count_sessions.status', 'completed')
        .limit(10)
    
    console.log(error || countData)
}

testFetch()
