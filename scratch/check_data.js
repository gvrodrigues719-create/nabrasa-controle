
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkData() {
  const { data: groups } = await supabase.from('groups').select('id, name');
  const { data: routines } = await supabase.from('routines').select('id, name, routine_type').eq('active', true);
  const { data: users } = await supabase.from('users').select('id, name, role').ilike('name', '%Teste%');

  console.log('GROUPS:');
  console.table(groups);
  console.log('\nROUTINES:');
  console.table(routines);
  console.log('\nTEST USERS:');
  console.table(users);
}

checkData();
