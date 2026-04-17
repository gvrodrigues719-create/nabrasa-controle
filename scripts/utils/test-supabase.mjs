import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env.local', 'utf8')
const envs = {}
envFile.split('\n').filter(l => l.includes('=')).forEach(line => {
    const idx = line.indexOf('=')
    const k = line.substring(0, idx).trim()
    const v = line.substring(idx + 1).trim()
    envs[k] = v
})

console.log("Validando URL carregada do env.local:", envs.NEXT_PUBLIC_SUPABASE_URL)

const supabase = createClient(envs.NEXT_PUBLIC_SUPABASE_URL, envs.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function runTests() {
    try {
        console.log("\n--- TESTE 1: INSERÇÃO E AUTENTICAÇÃO (MOCK) ---")
        const email = 'tester_' + Date.now() + '@teste.com'
        const { data: authData, error: authErr } = await supabase.auth.signUp({
            email: email,
            password: 'senhaSegura123!',
            options: { data: { name: 'Operador Teste' } }
        })
        if (authErr) {
            console.log("❌ Erro de Autenticação:", authErr.message)
        } else {
            console.log("✅ Sign Up sucedido, usuário criado.")
        }

        console.log("\n--- TESTE 2: LISTAR GRUPOS (POLICIES) ---")
        const { data: grp, error: grpErr } = await supabase.from('groups').select('*').limit(5)

        if (grpErr) {
            console.log("❌ Erro ao ler Groups (Tabela não existe ou RLS bloqueou):", grpErr.message)
        } else {
            console.log("✅ Tabela groups acessível. Qtde lida:", grp.length)
        }

        console.log("\n--- TESTE 3: ACESSO DE ADMIN SOMENTE (THEORETICAL STOCK) ---")
        const { data: theo, error: theoErr } = await supabase.from('theoretical_stock').select('*').limit(1)
        if (theoErr) {
            console.log("⚠️ Leitura theoretical_stock falhou como esperado (RLS bloqueia Operador):", theoErr.message)
        } else {
            console.log("✅/❌ theoretical_stock acessado (Pode indicar RLS mal configurado se o teste for por operador/anon):", theo.length, "itens lidos.")
        }
    } catch (e) {
        console.log("CRASH:", e)
    }
}
runTests()
