const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkData() {
    console.log("--- BUSCANDO TODAS AS SESSÕES DE HOJE (2026-05-03) ---")
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
            routines(name)
        `)
        .gte('started_at', '2026-05-03T00:00:00Z')
        .order('started_at', { ascending: false })

    if (sessErr) {
        console.error("Erro ao buscar sessões:", sessErr)
        return
    }

    if (sessions.length === 0) {
        console.log("Nenhuma sessão encontrada para hoje.")
    } else {
        sessions.forEach(s => {
            console.log(`ID: ${s.id} | Grupo: ${s.groups?.name} | Status: ${s.status} | Rotina: ${s.routines?.name} | Início: ${s.started_at}`)
        })
    }
}

checkData()
