const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkSchema() {
    const { data, error } = await supabase.rpc('execute_sql', { 
        sql_query: `
            SELECT
                conname as constraint_name,
                pg_get_constraintdef(c.oid) as constraint_definition
            FROM pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE n.nspname = 'public' AND conrelid = 'count_sessions'::regclass;
        `
    })
    
    if (error) console.error(error)
    else console.log(JSON.stringify(data, null, 2))
}

checkSchema()
