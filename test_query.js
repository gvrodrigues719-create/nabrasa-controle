require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testQuery() {
  const { data, error } = await supabase
    .from('items')
    .select('id, name, category_id, unit')
    .ilike('name', '%farofa%');
  
  console.log('Query Farofa:', data, error);
}

testQuery();
