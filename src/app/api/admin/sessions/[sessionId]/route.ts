import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireManagerOrAdmin } from '@/lib/auth-utils'
import { getAccessibleCountScope } from '@/lib/server-auth-context'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  // ── Segurança: apenas manager/admin ──────────────────────────────────────
  let scope: any
  try {
    await requireManagerOrAdmin()
    scope = await getAccessibleCountScope()
  } catch (err: any) {
    const isUnauth = err?.message?.includes('não autenticado') || err?.message?.includes('não encontrado')
    return NextResponse.json({ error: err.message }, { status: isUnauth ? 401 : 403 })
  }

  const { sessionId } = await params

  try {
    // 1. Busca a sessão com campos explícitos e filtros de escopo
    let query = supabaseAdmin
      .from('count_sessions')
      .select(`
        id, status, started_at, completed_at, updated_at, user_id, group_id, routine_id,
        users!inner(name, unit_id),
        groups!inner(name, macro_sector)
      `)
      .eq('id', sessionId)

    // ── Aplicar Escopo de Segurança ──────────────────────────────────────────
    if (scope.type === 'kitchen') {
      query = query.eq('groups.macro_sector', 'Cozinha Central')
    } else if (scope.type === 'store') {
      query = query.eq('users.unit_id', scope.unitId).neq('groups.macro_sector', 'Cozinha Central')
    } else if (scope.type === 'restricted') {
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
    }

    const { data: sessions, error: sErr } = await query.limit(1)

    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })
    if (!sessions || sessions.length === 0) return NextResponse.json({ error: 'Sessão não encontrada ou acesso negado' }, { status: 404 })

    const session: any = sessions[0]

    const enrichedSession = {
      ...session,
      group_name: session.groups?.name || 'Local desconhecido',
      user_name: session.users?.name || 'Operador desconhecido',
    }

    // 3. Busca itens da sessão com campos explícitos
    const { data: sessionItems, error: iErr } = await supabaseAdmin
      .from('count_session_items')
      .select('session_id, item_id, counted_quantity, is_zeroed, updated_at')
      .eq('session_id', sessionId)

    if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 })

    // 4. Busca nomes dos itens
    const itemIds = (sessionItems || []).map((i: any) => i.item_id).filter(Boolean)
    let itemMap: Record<string, { name: string; unit: string }> = {}

    if (itemIds.length > 0) {
      const { data: itemsRef } = await supabaseAdmin
        .from('items')
        .select('id, name, unit')
        .in('id', itemIds)
      itemMap = Object.fromEntries((itemsRef || []).map((ir: any) => [ir.id, { name: ir.name, unit: ir.unit }]))
    }

    const enrichedItems = (sessionItems || []).map((item: any) => ({
      ...item,
      item_name: itemMap[item.item_id]?.name || 'Item desconhecido',
      item_unit: itemMap[item.item_id]?.unit || 'un',
    }))

    return NextResponse.json({ session: enrichedSession, items: enrichedItems })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
