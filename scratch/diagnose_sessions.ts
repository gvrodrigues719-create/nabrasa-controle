import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function diagnoseSessions() {
    console.log('--- DIAGNÓSTICO DE SESSÕES COZINHA CENTRAL ---')

    const sql1 = `
    SELECT
      cs.id AS session_id,
      cs.status,
      cs.started_at,
      cs.completed_at,
      cs.updated_at,
      cs.execution_id,
      cs.user_id,
      u.name AS user_name,
      cs.group_id,
      g.name AS group_name,
      g.macro_sector,
      cs.routine_id,
      r.name AS routine_name,
      COUNT(csi.item_id) AS total_linhas,
      COUNT(*) FILTER (WHERE csi.counted_quantity IS NOT NULL OR csi.is_zeroed = true) AS itens_preenchidos
    FROM public.count_sessions cs
    LEFT JOIN public.groups g ON g.id = cs.group_id
    LEFT JOIN public.routines r ON r.id = cs.routine_id
    LEFT JOIN public.users u ON u.id = cs.user_id
    LEFT JOIN public.count_session_items csi ON csi.session_id = cs.id
    WHERE cs.started_at >= CURRENT_DATE
      AND (
        g.macro_sector = 'Cozinha Central'
        OR g.name ILIKE 'CK%'
        OR r.name ILIKE '%Cozinha Central%'
        OR u.name ILIKE '%Cozinha Central%'
      )
    GROUP BY cs.id, u.name, g.name, g.macro_sector, r.name
    ORDER BY cs.started_at DESC;
    `

    const sql2 = `
    SELECT
      cs.id AS session_id,
      cs.status,
      cs.started_at,
      cs.completed_at,
      cs.updated_at,
      cs.execution_id,
      u.name AS user_name,
      g.name AS group_name,
      g.macro_sector,
      r.name AS routine_name,
      COUNT(csi.item_id) AS total_linhas,
      COUNT(*) FILTER (WHERE csi.counted_quantity IS NOT NULL OR csi.is_zeroed = true) AS itens_preenchidos
    FROM public.count_sessions cs
    LEFT JOIN public.groups g ON g.id = cs.group_id
    LEFT JOIN public.routines r ON r.id = cs.routine_id
    LEFT JOIN public.users u ON u.id = cs.user_id
    LEFT JOIN public.count_session_items csi ON csi.session_id = cs.id
    WHERE cs.started_at >= NOW() - INTERVAL '2 days'
      AND (
        g.macro_sector = 'Cozinha Central'
        OR g.name ILIKE 'CK%'
        OR r.name ILIKE '%Cozinha Central%'
        OR u.name ILIKE '%Cozinha Central%'
      )
    GROUP BY cs.id, u.name, g.name, g.macro_sector, r.name
    ORDER BY cs.started_at DESC;
    `

    console.log('Executando Query 1 (Hoje)...')
    const res1 = await supabase.rpc('exec_sql', { sql: sql1 })
    if (res1.error) console.error('Erro Query 1:', res1.error)
    else console.log('Resultado Query 1:', JSON.stringify(res1.data, null, 2))

    console.log('\nExecutando Query 2 (2 dias)...')
    const res2 = await supabase.rpc('exec_sql', { sql: sql2 })
    if (res2.error) console.error('Erro Query 2:', res2.error)
    else console.log('Resultado Query 2:', JSON.stringify(res2.data, null, 2))
}

diagnoseSessions()
