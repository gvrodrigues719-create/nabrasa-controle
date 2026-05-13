const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  const { data: users } = await supabase.from('users').select('id, name, role, unit_id, primary_group_id, active').or('name.ilike.%Alan%,name.ilike.%Operador Teste%');
  const { data: groups } = await supabase.from('groups').select('id, name, macro_sector, active');
  const { data: sessions } = await supabase.from('count_sessions').select('id, status, started_at, user_id, group_id, users(name), groups(name, macro_sector), routines(name)').gte('started_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()).order('started_at', { ascending: false });

  console.log(JSON.stringify({ users, groups, sessions }, null, 2));
}
diagnose();
