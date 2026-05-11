require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testQuery() {
  const { data, error } = await supabase
    .from('count_session_items')
    .select(`
        count_sessions(groups(name, macro_sector), status)
    `)
    .eq('item_id', '965eba9c-865f-4313-9e6f-23c0b49c9742')
    .limit(10);
  
  console.log('Count sessions:', data, error);
}

testQuery();
