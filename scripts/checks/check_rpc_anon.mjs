import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

// Simula o browser: usa chave ANON (não service role)
const envFile = fs.readFileSync('.env.local', 'utf8')
const envs = {}
envFile.split('\n').filter(l => l.includes('=')).forEach(line => {
    const idx = line.indexOf('=')
    if (idx !== -1) envs[line.substring(0, idx).trim()] = line.substring(idx + 1).trim()
})
const supabase = createClient(envs.NEXT_PUBLIC_SUPABASE_URL, envs.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function run() {
    // 1. Login como usuário (simula browser)
    const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'guilherme@nabrasa.com.br',
        password: 'nabrasa2024'
    })

    if (authErr) {
        console.log('LOGIN FALHOU:', authErr.message)
        console.log('(Normal se a senha/email estiver diferente - teste o GRANT manualmente no browser)')

        // Testa pelo menos se a função aparece no schema via anon sem login
        const { error: rpcErr } = await supabase.rpc('start_routine_snapshot', { p_routine_id: '00000000-0000-0000-0000-000000000000' })
        if (rpcErr?.code === 'PGRST202') {
            console.log('❌ RPC ainda não encontrada no schema cache (PGRST202)')
        } else if (rpcErr?.message?.includes('not found')) {
            console.log('❌ RPC ainda com 404')
        } else {
            console.log('✅ RPC encontrada no schema cache (erro de auth/dados esperado, não de 404):', rpcErr?.code, rpcErr?.hint?.substring(0, 60) || '')
        }
        return
    }

    console.log('✅ Login OK como:', auth.user?.email)

    // 2. Pegar rotina
    const { data: routines } = await supabase.from('routines').select('id, name').limit(1)
    if (!routines?.length) { console.log('Nenhuma rotina'); return }

    // 3. Chamar RPC via anon+auth (simula o browser)
    const { data: execId, error: rpcErr } = await supabase.rpc('start_routine_snapshot', { p_routine_id: routines[0].id })

    if (rpcErr) {
        console.log('❌ RPC FALHOU:', rpcErr.code, rpcErr.message)
    } else {
        console.log(`✅ RPC OK com chave ANON → execution_id = ${execId}`)
        console.log('✅ BUG CRÍTICO #1 RESOLVIDO — fluxo de contagem desbloqueado')
    }

    await supabase.auth.signOut()
}
run()
