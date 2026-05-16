const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('users').select('*, user_pins(*)').limit(1);
  if (error) console.log('user_pins error:', error.message);
  else console.log('user_pins success:', data);
  
  // Also check if verify_user_pin RPC source code is visible
}

run();
