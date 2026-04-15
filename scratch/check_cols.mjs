import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf8')
const getEnv = (key) => env.match(new RegExp(`${key}=(.*)`))?.[1]

const supabase = createClient(
    getEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getEnv('SUPABASE_SERVICE_ROLE_KEY')
)

async function test() {
    const { data, error } = await supabase.from('routine_executions').select('*').limit(1).single()
    if (data) {
        console.log('Columns:', Object.keys(data))
    } else {
        console.log('Error or no data:', error)
    }
}
test()
