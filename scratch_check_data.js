const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkData() {
    console.log("--- BUSCANDO SESSÕES RECENTES ---")
    const { data: sessions, error: sessErr } = await supabase
        .from('count_sessions')
        .select(`
            id, 
            status, 
            started_at, 
            completed_at, 
            group_id, 
            groups(name),
            routine_id,
            routines(name, snapshot_started_at)
        `)
        .order('started_at', { ascending: false })
        .limit(10)

    if (sessErr) {
        console.error("Erro ao buscar sessões:", sessErr)
        return
    }

    sessions.forEach(s => {
        console.log(`ID: ${s.id} | Grupo: ${s.groups?.name} | Status: ${s.status} | Rotina: ${s.routines?.name} | Início: ${s.started_at}`)
        if (s.routines?.snapshot_started_at && s.started_at < s.routines.snapshot_started_at) {
            console.log(`   ⚠️  Sessão iniciada ANTES do último snapshot (${s.routines.snapshot_started_at})`)
        }
    })

    console.log("\n--- BUSCANDO ITENS DA ÚLTIMA SESSÃO ---")
    if (sessions.length > 0) {
        const lastSession = sessions[0]
        const { count, error: countErr } = await supabase
            .from('count_session_items')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', lastSession.id)
        
        console.log(`Última sessão (${lastSession.groups?.name}) tem ${count} itens salvos.`)
    }
}

checkData()
