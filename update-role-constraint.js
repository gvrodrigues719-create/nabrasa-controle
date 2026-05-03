require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql: `
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'manager', 'operator', 'kitchen'));
    `
  })

  console.log('Result of execute_sql:', data, error)

  if (error && error.message.includes('function execute_sql does not exist')) {
    console.log('execute_sql does not exist, let me just use the REST API if possible or print a message to the user.')
  }
}

run()
