import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const envFile = fs.readFileSync('.env.local', 'utf8')
const envs = {}
envFile.split('\n').filter(l => l.includes('=')).forEach(line => {
    const idx = line.indexOf('=')
    if (idx !== -1) envs[line.substring(0, idx).trim()] = line.substring(idx + 1).trim()
})
const supabase = createClient(envs.NEXT_PUBLIC_SUPABASE_URL, envs.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
    // 1. Verificar se a tabela routine_executions existe
    const { data: execRows, error: execErr } = await supabase.from('routine_executions').select('id').limit(1)
    console.log('routine_executions:', execErr ? `ERRO: ${execErr.message}` : 'OK (tabela acessível)')

    // 2. Verificar se a view v_routine_execution_history existe
    const { data: viewRows, error: viewErr } = await supabase.from('v_routine_execution_history').select('execution_id').limit(1)
    console.log('v_routine_execution_history:', viewErr ? `ERRO: ${viewErr.message}` : 'OK (view acessível)')

    // 3. Verificar se count_sessions tem a coluna execution_id
    const { data: sessRows, error: sessErr } = await supabase.from('count_sessions').select('id, execution_id').limit(1)
    console.log('count_sessions.execution_id:', sessErr ? `ERRO: ${sessErr.message}` : 'OK (coluna existe)')

    // 4. Verificar se audit_reports tem a coluna execution_id
    const { data: repRows, error: repErr } = await supabase.from('audit_reports').select('id, execution_id').limit(1)
    console.log('audit_reports.execution_id:', repErr ? `ERRO: ${repErr.message}` : 'OK (coluna existe)')

    // 5. Testar RPC start_routine_snapshot (verificar se aceita p_routine_id e retorna UUID)
    const { data: routines } = await supabase.from('routines').select('id, name').limit(1)
    if (routines?.length) {
        const { data: execId, error: rpcErr } = await supabase.rpc('start_routine_snapshot', { p_routine_id: routines[0].id })
        console.log(`RPC start_routine_snapshot (rotina: ${routines[0].name}):`, rpcErr ? `ERRO: ${rpcErr.message}` : `OK → execution_id = ${execId}`)

        if (execId) {
            // Confirmar que o registro foi criado em routine_executions
            const { data: created } = await supabase.from('routine_executions').select('id, started_at, status').eq('id', execId).maybeSingle()
            console.log('Ciclo criado no banco:', created ? `OK (status: ${created.status}, em: ${created.started_at})` : 'NÃO ENCONTRADO')
        }
    } else {
        console.log('Nenhuma rotina encontrada para testar RPC.')
    }
}
run()
