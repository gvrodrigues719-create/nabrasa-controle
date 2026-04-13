import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    console.log("Fetching users...")
    const { data: users, error } = await supabase.from('users').select('*').eq('active', true)

    if (error) {
        console.error("Error fetching users:", error)
        return
    }

    for (const user of users) {
        console.log(`Setting PIN 1234 for ${user.name} (${user.role})`)
        const { error: pinErr } = await supabase.rpc('admin_set_user_pin', { p_user_id: user.id, p_pin: '1234' })
        if (pinErr) {
            console.error(`Failed to set PIN for ${user.id}:`, pinErr)
        }
    }

    // Fix the "pedaço de email" issue for testing cleanly
    for (const user of users) {
        if (user.name === 'gvrodrigues719' || user.name.includes('@')) {
            const newName = user.name === 'gvrodrigues719' ? 'Guilherme Gerente' : 'Operador ' + user.name.split('@')[0]
            await supabase.from('users').update({ name: newName }).eq('id', user.id)
            console.log(`Renamed dirty name to ${newName}`)
        }
    }

    console.log("Done setting up PINs.")
}

run()
