import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Usa a service role key para ignorar RLS e garantir que todos os dispositivos vejam os dados
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // 1. Busca todas as sessões
    const { data: sessions, error } = await supabaseAdmin
      .from('count_sessions')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('[API/sessions] Erro ao buscar sessões:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ sessions: [] })
    }

    // 2. Coleta IDs únicos
    const userIds = [...new Set(sessions.map((s: any) => s.user_id).filter(Boolean))]
    const groupIds = [...new Set(sessions.map((s: any) => s.group_id).filter(Boolean))]

    // 3. Busca usuários e grupos em paralelo
    const [{ data: usersData }, { data: groupsData }] = await Promise.all([
      supabaseAdmin.from('users').select('id, name').in('id', userIds),
      supabaseAdmin.from('groups').select('id, name').in('id', groupIds),
    ])

    const userMap = Object.fromEntries((usersData || []).map((u: any) => [u.id, u.name]))
    const groupMap = Object.fromEntries((groupsData || []).map((g: any) => [g.id, g.name]))

    // 4. Enriquece os dados
    const enriched = sessions.map((s: any) => ({
      ...s,
      user_name: userMap[s.user_id] || 'Operador',
      group_name: groupMap[s.group_id] || 'Local desconhecido',
    }))

    return NextResponse.json({ sessions: enriched })
  } catch (err: any) {
    console.error('[API/sessions] Erro fatal:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
