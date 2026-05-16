const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
  .from('users')
  .select(`
    id,
    name,
    user_pin_credentials!inner (user_id)
  `)
  .eq('active', true)
  .in('role', ['operator', 'kitchen', 'manager', 'admin'])
  .order('name');

  if (error) {
    console.error('query error:', error.message);
  } else {
    console.log('query success:', data);
  }
}

run();
