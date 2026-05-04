import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireManagerOrAdmin } from '@/lib/auth-utils'
import { isCountSessionStuck, countSessionDurationMin } from '@/lib/count-session-utils'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  // ── Segurança: apenas manager/admin ──────────────────────────────────────
  try {
    await requireManagerOrAdmin()
  } catch (err: any) {
    const isUnauth = err?.message?.includes('não autenticado') || err?.message?.includes('não encontrado')
    return NextResponse.json({ error: err.message }, { status: isUnauth ? 401 : 403 })
  }

  try {
    const { data: sessions, error } = await supabaseAdmin
      .from('count_sessions')
      .select('id, status, started_at, completed_at, updated_at, user_id, group_id, routine_id, execution_id')
      .order('started_at', { ascending: false })
      .limit(200)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!sessions || sessions.length === 0) return NextResponse.json({ sessions: [] })

    const groupIds = [...new Set(sessions.map((s: any) => s.group_id).filter(Boolean))]
    const userIds = [...new Set(sessions.map((s: any) => s.user_id).filter(Boolean))]

    const [{ data: groups }, { data: users }] = await Promise.all([
      supabaseAdmin.from('groups').select('id, name, macro_sector').in('id', groupIds),
      supabaseAdmin.from('users').select('id, name, role').in('id', userIds),
    ])

    const groupMap = Object.fromEntries((groups || []).map((g: any) => [g.id, g]))
    const userMap = Object.fromEntries((users || []).map((u: any) => [u.id, u]))

    const enriched = sessions.map((s: any) => ({
      ...s,
      group_name: groupMap[s.group_id]?.name || 'Local desconhecido',
      user_name: userMap[s.user_id]?.name || 'Operador',
      is_stuck: isCountSessionStuck(s),
    }))

    return NextResponse.json({ sessions: enriched })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
