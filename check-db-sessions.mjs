import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function run() {
    const { data: routines } = await supabase.from('routines').select('id, name');
    for (const r of routines) {
        console.log("Routine:", r.name);
        const { data: latestExec } = await supabase.from('routine_executions').select('id').eq('routine_id', r.id).order('started_at', { ascending: false }).limit(1).maybeSingle();
        if (latestExec) {
            const { data: sessions } = await supabase.from('count_sessions').select('id, group_id, status').eq('execution_id', latestExec.id);
            console.log("  Exec ID:", latestExec.id);
            console.log("  Sessions:", sessions);
        } else {
            console.log("  No execution");
        }
    }
}
run();
