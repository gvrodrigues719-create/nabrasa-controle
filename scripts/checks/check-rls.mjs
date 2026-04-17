import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY // ROOT KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    const { data, error } = await supabase.from('routines').select('*')
    console.log("SERVICE ROLE Routines:", data?.length)

    // Test ANON key
    const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { data: anonData, error: anonErr } = await anonClient.from('routines').select('*')
    console.log("ANON Routines:", anonData?.length, anonErr?.message)
}

run()
