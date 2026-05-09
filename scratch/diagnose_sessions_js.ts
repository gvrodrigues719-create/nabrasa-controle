import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function diagnoseSessionsJS() {
    console.log('--- DIAGNÓSTICO JS DE SESSÕES COZINHA CENTRAL ---')

    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    const { data: sessions, error } = await supabase
        .from('count_sessions')
        .select(`
            id,
            status,
            started_at,
            completed_at,
            updated_at,
            execution_id,
            user_id,
            users!user_id(name),
            group_id,
            groups!group_id(name, macro_sector),
            routine_id,
            routines!routine_id(name)
        `)
        .gte('started_at', twoDaysAgo.toISOString())
        .order('started_at', { ascending: false })

    if (error) {
        console.error('Erro ao buscar sessões:', error)
        return
    }

    const filtered = sessions.filter((s: any) => {
        const groupName = s.groups?.name || ''
        const macroSector = s.groups?.macro_sector || ''
        const routineName = s.routines?.name || ''
        const userName = s.users?.name || ''

        return macroSector === 'Cozinha Central' ||
               groupName.includes('CK') ||
               routineName.includes('Cozinha Central') ||
               userName.includes('Cozinha Central')
    })

    console.log(`Encontradas ${filtered.length} sessões candidatas.\n`)

    const results = []
    for (const s of filtered) {
        const { count, error: countErr } = await supabase
            .from('count_session_items')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', s.id)

        const { count: filled, error: filledErr } = await supabase
            .from('count_session_items')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', s.id)
            .or('counted_quantity.not.is.null,is_zeroed.eq.true')

        results.push({
            session_id: s.id,
            status: s.status,
            started_at: s.started_at,
            completed_at: s.completed_at,
            updated_at: s.updated_at,
            user_name: s.users?.name,
            group_name: s.groups?.name,
            macro_sector: s.groups?.macro_sector,
            routine_name: s.routines?.name,
            total_linhas: count || 0,
            itens_preenchidos: filled || 0
        })
    }

    console.log(JSON.stringify(results, null, 2))
}

diagnoseSessionsJS()
