import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const envFile = fs.readFileSync('.env.local', 'utf8')
const envs = {}
envFile.split('\n').forEach(line => {
    const idx = line.indexOf('=')
    if (idx !== -1) envs[line.substring(0, idx).trim()] = line.substring(idx + 1).trim()
})
const supabase = createClient(envs.NEXT_PUBLIC_SUPABASE_URL, envs.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function testLogin() {
    const res = await supabase.auth.signInWithPassword({
        email: 'val_admin@test.com',
        password: 'admin'
    })
    if(res.error) {
        const res2 = await supabase.auth.signInWithPassword({
            email: 'val_admin@test.com',
            password: 'Val_admin_123'
        })
        if(res2.error) {
             const res3 = await supabase.auth.signInWithPassword({
                 email: 'val_admin@test.com',
                 password: 'password'
             })
             console.log(res3.error ? "Todos falharam" : "Senha é password")
        } else { console.log("Senha é Val_admin_123") }
    } else {
        console.log("Senha é admin")
    }
}
testLogin()
