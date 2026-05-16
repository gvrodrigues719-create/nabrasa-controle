const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- Verifying users table and pin_hash ---');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, name, role, active, pin_hash')
    .eq('active', true);
    
  if (usersError) {
    console.error('Error fetching users:', usersError);
  } else {
    console.log(`Found ${users.length} active users.`);
    const withPin = users.filter(u => u.pin_hash !== null);
    console.log(`Found ${withPin.length} users with PIN configured.`);
    console.log('Sample users with PIN:', withPin.slice(0, 3));
  }

  console.log('\n--- Verifying verify_user_pin RPC ---');
  if (users && users.length > 0) {
    const sampleUser = users.find(u => u.pin_hash !== null);
    if (sampleUser) {
      const { data: isValid, error: rpcError } = await supabase.rpc('verify_user_pin', { p_user_id: sampleUser.id, p_pin: '0000' });
      if (rpcError) {
        console.error('RPC verify_user_pin error:', rpcError);
      } else {
        console.log('RPC verify_user_pin exists and returned:', isValid);
      }
    }
  }
}

run();
