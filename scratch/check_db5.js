const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('user_pin_credentials').select('user_id').limit(5);
  if (error) {
    console.error('user_pin_credentials error:', error.message);
  } else {
    console.log('user_pin_credentials exists!', data.length, 'records found.');
    console.log(data);
  }
}

run();
