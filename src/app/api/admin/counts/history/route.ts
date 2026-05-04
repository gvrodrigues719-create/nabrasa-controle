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

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const groupId = searchParams.get('groupId')
  const status = searchParams.get('status')
  const userId = searchParams.get('userId')

  try {
    let query = supabaseAdmin
      .from('count_sessions')
      .select('id, status, started_at, completed_at, updated_at, user_id, group_id, routine_id')
      .order('started_at', { ascending: false })
      .limit(500)

    if (from) query = query.gte('started_at', from)
    if (to) {
      const toDate = new Date(to)
      toDate.setDate(toDate.getDate() + 1)
      query = query.lt('started_at', toDate.toISOString())
    }
    if (groupId) query = query.eq('group_id', groupId)
    if (status && status !== 'all') {
      if (status === 'stuck') {
        const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
        query = query.neq('status', 'completed').lt('started_at', eightHoursAgo)
      } else {
        query = query.eq('status', status)
      }
    }
    if (userId) query = query.eq('user_id', userId)

    const { data: sessions, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!sessions || sessions.length === 0) return NextResponse.json({ sessions: [] })

    const groupIds = [...new Set(sessions.map((s: any) => s.group_id).filter(Boolean))]
    const userIds = [...new Set(sessions.map((s: any) => s.user_id).filter(Boolean))]
    const routineIds = [...new Set(sessions.map((s: any) => s.routine_id).filter(Boolean))]
    const sessionIds = sessions.map((s: any) => s.id)

    const [{ data: groups }, { data: users }, { data: routines }, { data: itemCounts }] = await Promise.all([
      supabaseAdmin.from('groups').select('id, name, macro_sector').in('id', groupIds),
      supabaseAdmin.from('users').select('id, name, role').in('id', userIds),
      supabaseAdmin.from('routines').select('id, name').in('id', routineIds),
      supabaseAdmin.from('count_session_items').select('session_id, item_id, counted_quantity, is_zeroed').in('session_id', sessionIds),
    ])

    const groupMap = Object.fromEntries((groups || []).map((g: any) => [g.id, g]))
    const userMap = Object.fromEntries((users || []).map((u: any) => [u.id, u]))
    const routineMap = Object.fromEntries((routines || []).map((r: any) => [r.id, r]))

    const itemsBySession: Record<string, { total: number; counted: number; zeroed: number }> = {}
    for (const item of (itemCounts || []) as any[]) {
      if (!itemsBySession[item.session_id]) itemsBySession[item.session_id] = { total: 0, counted: 0, zeroed: 0 }
      itemsBySession[item.session_id].total++
      if (item.is_zeroed) itemsBySession[item.session_id].zeroed++
      else if (item.counted_quantity !== null) itemsBySession[item.session_id].counted++
    }

    const enriched = sessions.map((s: any) => {
      const counts = itemsBySession[s.id] || { total: 0, counted: 0, zeroed: 0 }
      return {
        ...s,
        group_name: groupMap[s.group_id]?.name || 'Local desconhecido',
        macro_sector: groupMap[s.group_id]?.macro_sector || '',
        user_name: userMap[s.user_id]?.name || 'Operador',
        routine_name: routineMap[s.routine_id]?.name || '',
        total_items: counts.total,
        counted_items: counts.counted,
        zeroed_items: counts.zeroed,
        pending_items: counts.total - counts.counted - counts.zeroed,
        is_stuck: isCountSessionStuck(s),
        duration_min: countSessionDurationMin(s.started_at, s.completed_at),
      }
    })

    return NextResponse.json({ sessions: enriched })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
