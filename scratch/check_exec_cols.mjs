import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkCols() {
  const { data, error } = await supabase.from('routine_executions').select('*').limit(1)
  if (error) {
    console.error('Error fetching routine_executions:', error.message)
  } else {
    console.log('Columns in routine_executions:', Object.keys(data[0] || {}))
  }
}

checkCols()
