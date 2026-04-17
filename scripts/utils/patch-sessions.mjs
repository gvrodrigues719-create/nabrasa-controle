import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function run() {
    const { data: execs } = await supabase.from('routine_executions').select('id, routine_id').eq('status', 'active');
    
    for (const exec of execs) {
        const { error } = await supabase.from('count_sessions').update({ execution_id: exec.id })
            .eq('routine_id', exec.routine_id)
            .is('execution_id', null);
        if (error) console.error(error);
        else console.log(`Patched sessions for routine ${exec.routine_id}`);
    }
}
run();
