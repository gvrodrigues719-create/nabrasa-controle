const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('hello_world'); // just checking connection
  
  // Actually, we can just run a raw query via postgrest or just fetch a single user
  const { data: user, error: err } = await supabase.from('users').select('*').limit(1);
  if (err) console.error(err);
  else console.log('User columns:', Object.keys(user[0] || {}));
}

run();
