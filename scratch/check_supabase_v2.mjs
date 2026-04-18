import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

async function runAnalysis() {
    console.log("=== ANÁLISE CRITERIOSA: SUPABASE STORAGE ===")
    
    // 1. Carregar Env
    let supabaseUrl = ''
    let supabaseKey = ''
    
    try {
        const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8')
        supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1] || ''
        supabaseKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1] || ''
    } catch (e) {
        console.error("Não foi possível ler .env.local")
        return
    }

    if (!supabaseUrl || !supabaseKey) {
        console.error("Variáveis de ambiente incompletas no .env.local")
        return
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 2. Verificar Baldes (Buckets)
    console.log("\n1. Verificando Buckets...")
    const { data: buckets, error: bError } = await supabase.storage.listBuckets()
    if (bError) {
        console.error("❌ Erro ao listar buckets:", bError.message)
    } else {
        console.log("✅ Buckets encontrados:", buckets.map(b => `${b.id} (Público: ${b.public})`))
    }

    const bucketId = 'checklist-evidences'
    const bucketExists = buckets?.some(b => b.id === bucketId)

    if (!bucketExists) {
        console.error(`❌ ERRO CRÍTICO: O bucket '${bucketId}' NÃO EXISTE no projeto.`)
        console.log("Dica: Você precisa criar esse bucket manualmente no Dashboard do Supabase.")
        return
    }

    // 3. Testar Upload com Service Role (Ignora RLS)
    console.log(`\n2. Testando upload com MASTER KEY para '${bucketId}/avatars/test.txt'...`)
    const { data, error: uError } = await supabase.storage
        .from(bucketId)
        .upload('avatars/test_connection.txt', Buffer.from('Análise de Conexão'), { upsert: true })

    if (uError) {
        console.error("❌ Upload FALHOU (mesmo com Master Key):", uError.message)
        console.log("Isso sugere um erro de configuração de rede, bucket ou URL/Key inválidos.")
    } else {
        console.log("✅ Upload com Master Key: SUCESSO!")
        console.log("Conclusão Técnica: O bucket existe e o caminho 'avatars/' é válido.")
        console.log("VEREDITO: O problema é EXCLUSIVAMENTE de RLS (permissões de banco).")
    }

    // 4. Verificar se há registros na tabela users
    console.log("\n3. Verificando integridade da tabela public.users...")
    const { count, error: cError } = await supabase.from('users').select('*', { count: 'exact', head: true })
    if (cError) {
        console.error("❌ Erro ao acessar a tabela public.users:", cError.message)
    } else {
        console.log(`✅ Tabela public.users acessível. Registros: ${count}`)
    }
}

runAnalysis()
