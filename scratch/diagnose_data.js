
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function diagnose() {
    console.log('--- Query 1 & 2: Sessões CK nos últimos 2 dias ---');
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const { data: sessions, error: sErr } = await supabase
        .from('count_sessions')
        .select(`
            id, status, started_at, completed_at, updated_at, execution_id, user_id,
            users:user_id(name),
            groups:group_id(name, macro_sector),
            routines:routine_id(name)
        `)
        .gte('started_at', twoDaysAgo.toISOString())
        .order('started_at', { ascending: false });

    if (sErr) console.error('Error fetching sessions:', sErr);

    const filteredSessions = sessions?.filter(cs => {
        const groupName = cs.groups?.name || '';
        const macroSector = cs.groups?.macro_sector || '';
        const routineName = cs.routines?.name || '';
        const userName = cs.users?.name || '';

        return macroSector === 'Cozinha Central' || 
               groupName.toUpperCase().includes('CK') || 
               routineName.toUpperCase().includes('COZINHA CENTRAL') || 
               userName.toUpperCase().includes('COZINHA CENTRAL');
    }) || [];

    for (const s of filteredSessions) {
        const { count, error: cErr } = await supabase
            .from('count_session_items')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', s.id);
        
        const { count: filledCount } = await supabase
            .from('count_session_items')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', s.id)
            .or('counted_quantity.not.is.null,is_zeroed.eq.true');

        console.log(`Session: ${s.id} | Status: ${s.status} | Started: ${s.started_at} | User: ${s.users?.name} | Group: ${s.groups?.name} | Routine: ${s.routines?.name} | Total Lines: ${count} | Filled: ${filledCount}`);
    }

    console.log('\n--- Query 4: Itens salvos nos últimos 2 dias por Cozinha Central ---');
    const { data: items, error: iErr } = await supabase
        .from('count_session_items')
        .select(`
            session_id,
            counted_quantity,
            is_zeroed,
            items:item_id(name),
            sessions:session_id(
                status, started_at, completed_at,
                users:user_id(name),
                groups:group_id(name)
            )
        `)
        .order('id', { ascending: false })
        .limit(100); // Pegamos os últimos 100 itens para diagnóstico

    const filteredItems = items?.filter(i => 
        i.sessions?.users?.name?.toUpperCase().includes('COZINHA CENTRAL')
    ) || [];

    filteredItems.forEach(i => {
        console.log(`Item: ${i.items?.name} | Qty: ${i.counted_quantity} | Zeroed: ${i.is_zeroed} | Session: ${i.session_id} | Group: ${i.sessions?.groups?.name} | User: ${i.sessions?.users?.name}`);
    });
}

diagnose().catch(console.error);
