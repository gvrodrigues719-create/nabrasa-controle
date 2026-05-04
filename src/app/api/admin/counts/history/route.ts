import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const groupId = searchParams.get('groupId')
  const status = searchParams.get('status')
  const userId = searchParams.get('userId')

  try {
    // 1. Build query for sessions
    let query = supabaseAdmin
      .from('count_sessions')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(500)

    if (from) query = query.gte('started_at', from)
    if (to) {
      // Add 1 day to 'to' to include the whole day
      const toDate = new Date(to)
      toDate.setDate(toDate.getDate() + 1)
      query = query.lt('started_at', toDate.toISOString())
    }
    if (groupId) query = query.eq('group_id', groupId)
    if (status && status !== 'all') {
      if (status === 'stuck') {
        // Stuck: not completed AND started more than 8 hours ago
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

    // 2. Collect unique IDs
    const groupIds = [...new Set(sessions.map((s: any) => s.group_id).filter(Boolean))]
    const userIds = [...new Set(sessions.map((s: any) => s.user_id).filter(Boolean))]
    const routineIds = [...new Set(sessions.map((s: any) => s.routine_id).filter(Boolean))]
    const sessionIds = sessions.map((s: any) => s.id)

    // 3. Fetch related data in parallel
    const [
      { data: groups },
      { data: users },
      { data: routines },
      { data: itemCounts }
    ] = await Promise.all([
      supabaseAdmin.from('groups').select('id, name, macro_sector').in('id', groupIds),
      supabaseAdmin.from('users').select('id, name, role').in('id', userIds),
      supabaseAdmin.from('routines').select('id, name').in('id', routineIds),
      // Count items per session
      supabaseAdmin
        .from('count_session_items')
        .select('session_id, item_id, counted_quantity, is_zeroed')
        .in('session_id', sessionIds),
    ])

    const groupMap = Object.fromEntries((groups || []).map((g: any) => [g.id, g]))
    const userMap = Object.fromEntries((users || []).map((u: any) => [u.id, u]))
    const routineMap = Object.fromEntries((routines || []).map((r: any) => [r.id, r]))

    // Build item counts per session
    const itemsBySession: Record<string, { total: number; counted: number; zeroed: number }> = {}
    for (const item of (itemCounts || []) as any[]) {
      if (!itemsBySession[item.session_id]) {
        itemsBySession[item.session_id] = { total: 0, counted: 0, zeroed: 0 }
      }
      itemsBySession[item.session_id].total++
      if (item.is_zeroed) itemsBySession[item.session_id].zeroed++
      else if (item.counted_quantity !== null) itemsBySession[item.session_id].counted++
    }

    // 4. Enrich sessions
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000)

    const enriched = sessions.map((s: any) => {
      const group = groupMap[s.group_id] || {}
      const user = userMap[s.user_id] || {}
      const routine = routineMap[s.routine_id] || {}
      const counts = itemsBySession[s.id] || { total: 0, counted: 0, zeroed: 0 }
      
      const startedAt = new Date(s.started_at)
      const isStuck = s.status !== 'completed' && startedAt < eightHoursAgo
      
      // Calculate duration in minutes
      const endTime = s.completed_at ? new Date(s.completed_at) : null
      const durationMin = endTime ? Math.round((endTime.getTime() - startedAt.getTime()) / 60000) : null

      return {
        ...s,
        group_name: group.name || 'Local desconhecido',
        macro_sector: group.macro_sector || '',
        user_name: user.name || 'Operador',
        user_role: user.role || '',
        routine_name: routine.name || '',
        total_items: counts.total,
        counted_items: counts.counted,
        zeroed_items: counts.zeroed,
        pending_items: counts.total - counts.counted - counts.zeroed,
        is_stuck: isStuck,
        duration_min: durationMin,
      }
    })

    return NextResponse.json({ sessions: enriched })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
