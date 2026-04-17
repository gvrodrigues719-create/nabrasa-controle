import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // ANON KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    const { data: routines, error } = await supabase.from('routines').select('*')
    console.log("Routines read via ANON:", routines?.length, error ? error.message : "Success")
}

run()
