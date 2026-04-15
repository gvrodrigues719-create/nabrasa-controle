import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const envFile = fs.readFileSync('.env.local', 'utf8')
const envs = {}
envFile.split('\n').filter(l => l.includes('=')).forEach(line => {
    const idx = line.indexOf('=')
    if (idx !== -1) envs[line.substring(0, idx).trim()] = line.substring(idx + 1).trim()
})
const supabase = createClient(envs.NEXT_PUBLIC_SUPABASE_URL, envs.SUPABASE_SERVICE_ROLE_KEY)

async function resetPassword() {
    const { data: userRecord } = await supabase.from('users').select('id, email').eq('email', 'gvrodrigues719@gmail.com').single()
    if (!userRecord) {
        console.log("Usuário não encontrado na tabela 'users'. Tentando buscar na Auth Master...")
        
        // Tenta buscar na tabela central de Auth por e-mail:
        const { data: usersData, error: authErr } = await supabase.auth.admin.listUsers()
        const found = usersData?.users?.find(u => u.email === 'gvrodrigues719@gmail.com')
        
        if (found) {
            console.log("Achou no Auth DB com ID:", found.id)
            const { error: resetErr } = await supabase.auth.admin.updateUserById(found.id, { password: 'admin12345' })
            console.log("Status do Reset:", resetErr ? resetErr.message : "Senha resetada para admin12345")
        } else {
             console.log("E-mail realmente não consta no sistema.")
        }
        return
    }

    // Se encontrou ali, muda a senha também
    const { error } = await supabase.auth.admin.updateUserById(userRecord.id, { password: 'admin12345' })
    console.log("Status do Reset:", error ? error.message : "Sucesso. Senha mudada para admin12345")
}

resetPassword()
