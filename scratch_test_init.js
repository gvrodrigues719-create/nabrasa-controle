const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testInit() {
    const routineId = '8503b220-819c-4db9-8d9e-bce241f75aae' // Contagem Cozinha
    const groupId = '89969908-85a3-48b0-964d-ec9c8647c690' // Estoque Seco
    const userId = 'b4ac5ffd-40c3-46b1-9508-a1219cb925b6' // Admin

    console.log(`Testando init para grupo ${groupId} e usuário ${userId}`)
    
    // Import direto do código não dá no node puro sem babel, vamos emular a lógica do countAction.ts
    // 1. Pega cycleStart
    const { data: routineRow } = await supabase.from('routines').select('snapshot_started_at').eq('id', routineId).single()
    
    // Emula getCycleAnchorDate
    const brDateParts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
    const startOfDayBR = `${brDateParts}T03:00:00Z`;
    const cycleStart = routineRow?.snapshot_started_at || startOfDayBR;
    
    console.log(`Cycle Start: ${cycleStart}`)

    const { data: existingSession, error: sessErr } = await supabase
        .from('count_sessions')
        .select('id, status, user_id')
        .eq('routine_id', routineId)
        .eq('group_id', groupId)
        .gte('started_at', cycleStart)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (sessErr) console.error("Erro na busca:", sessErr)
    console.log("Sessão existente hoje:", existingSession)

    if (!existingSession) {
        console.log("Nenhuma sessão hoje. Criando uma nova...")
        // Tenta criar
        const { data: newSess, error: insErr } = await supabase.from('count_sessions').insert([{
            routine_id: routineId,
            group_id: groupId,
            user_id: userId,
            status: 'in_progress',
            started_at: new Date().toISOString()
        }]).select().single()
        
        if (insErr) console.error("Erro ao criar sessão:", insErr)
        else console.log("Nova sessão criada com sucesso:", newSess.id)
    }
}

testInit()
