const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching routines...');
  
  // We can use a raw SQL query if we have postgrest enabled for it, but usually we don't.
  // Instead, let's just try calling the RPC with invalid args to see if it exists.
  const { data, error } = await supabase.rpc('verify_user_pin', { p_user_id: '123e4567-e89b-12d3-a456-426614174000', p_pin: '0000' });
  console.log('Result:', data, 'Error:', error);
}

run();
