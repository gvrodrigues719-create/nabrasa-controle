import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const lines = envFile.split('\n');
const env = {};
for (const line of lines) {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetPassword() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) { console.error(error); return; }
  
  const user = users.find(u => u.email === 'gvrodrigues719@gmail.com');
  if (!user) { console.error("User not found!"); return; }
  
  const { error: updErr } = await supabase.auth.admin.updateUserById(user.id, {
    password: 'adminpassword123'
  });
  if (updErr) { console.error(updErr); return; }
  console.log("SUCCESS");
}
resetPassword();
