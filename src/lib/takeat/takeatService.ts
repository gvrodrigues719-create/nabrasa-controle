/**
 * TakeatService — Camada de integração com a API Takeat
 *
 * STATUS: STUB — estrutura pronta, integração real pendente.
 *
 * O que está aqui:
 * - Assinaturas de função definitivas baseadas na documentação confirmada
 * - Comentários indicando onde plugar a chamada real
 * - Tratamento de timezone (UTC-0 → Brasília) documentado
 *
 * O que AINDA NÃO está aqui:
 * - Credenciais reais (não versionar — usar variáveis de ambiente)
 * - Chamada HTTP real implementada
 * - Cache/refresh de token
 * - Paginação se a API suportar
 * - Tratamento de erros de rede
 *
 * TODO (próxima sprint):
 * 1. Adicionar TAKEAT_EMAIL e TAKEAT_PASSWORD em .env.local
 * 2. Implementar authenticate() com fetch real
 * 3. Implementar getTableSessions() com fetch real
 * 4. Adicionar cache do token (15 dias de expiração)
 * 5. Tratar timezone: front envia horário de Brasília, service converte para UTC-0
 */

import type {
  TakeatAuthPayload,
  TakeatAuthResponse,
  TakeatTableSession,
  TakeatTableSessionsParams,
  TakeatPeriodSummary,
} from './takeatTypes'

import { MOCK_SESSIONS, MOCK_SUMMARY, MOCK_PAYMENT_METHODS } from './takeatMockData'

const BASE_URL     = 'https://backend-pdv.takeat.app'
const BASE_API     = `${BASE_URL}/api/v1`
const MAX_DAYS     = 3  // limite por consulta conforme documentação

// -------------------------------------------------------------------
// AUTENTICAÇÃO
// POST /public/api/sessions
// -------------------------------------------------------------------
export async function authenticate(payload: TakeatAuthPayload): Promise<TakeatAuthResponse> {
  const res = await fetch(`${BASE_URL}/public/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(`Takeat auth error: ${res.status} ${JSON.stringify(errorData)}`)
  }

  return res.json()
}

// -------------------------------------------------------------------
// SESSÕES DE MESA / COMANDAS
// GET /table-sessions?start_date=...&end_date=...
// -------------------------------------------------------------------
export async function getTableSessions(
  token: string,
  params: TakeatTableSessionsParams
): Promise<TakeatTableSession[]> {
  // Validação: máximo de 3 dias por consulta
  const start = new Date(params.start_date)
  const end   = new Date(params.end_date)
  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  
  if (diffDays > MAX_DAYS) {
    throw new Error(`[TakeatService] Intervalo máximo é ${MAX_DAYS} dias por consulta.`)
  }

  const url = new URL(`${BASE_API}/table-sessions`)
  url.searchParams.set('start_date', params.start_date)
  url.searchParams.set('end_date', params.end_date)

  const res = await fetch(url.toString(), {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  })

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error')
    throw new Error(`Takeat sessions error: ${res.status} - ${errorText}`)
  }

  const data = await res.json()

  // Log defensivo: Takeat pode retornar array puro ou wrapper { data: [...] } / { sessions: [...] }
  console.info('[TakeatService] Retorno bruto:', {
    type: Array.isArray(data) ? 'array' : typeof data,
    topKeys: data && typeof data === 'object' && !Array.isArray(data) ? Object.keys(data) : null,
    count: Array.isArray(data) ? data.length : (Array.isArray(data?.data) ? data.data.length : null),
  })

  // Normaliza para array — cobre array puro, { data: [...] }, { sessions: [...] } e { table_sessions: [...] }
  const sessions: TakeatTableSession[] =
    Array.isArray(data) ? data :
    Array.isArray(data?.data) ? data.data :
    Array.isArray(data?.sessions) ? data.sessions :
    Array.isArray(data?.table_sessions) ? data.table_sessions :
    []

  return sessions
}

// -------------------------------------------------------------------
// MÉTODOS DE PAGAMENTO
// GET /payment-methods
// -------------------------------------------------------------------
export async function getPaymentMethods(token: string) {
  const res = await fetch(`${BASE_API}/payment-methods`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  
  if (!res.ok) throw new Error(`Takeat payment methods error: ${res.status}`)
  return res.json()
}

// -------------------------------------------------------------------
// AGREGAÇÃO — calcula resumo do período a partir das sessões
// -------------------------------------------------------------------
export function aggregatePeriodSummary(
  sessions: TakeatTableSession[],
  periodStart: string,
  periodEnd: string
): TakeatPeriodSummary {
  let totalProductsSold = 0
  let totalRevenue = 0 // sem serviço
  let totalWithService = 0
  let totalPaymentsCount = 0
  let totalDiscounts = 0
  const channels = new Set<string>()
  let nfceCount = 0

  const safeSessions = Array.isArray(sessions) ? sessions : []

  safeSessions.forEach(session => {
    if (!session) return

    if (session.channel?.name) channels.add(session.channel.name)
    if (session.nfce) nfceCount++
    if (Array.isArray(session.payments)) totalPaymentsCount += session.payments.length

    // Coleta pedidos por 3 caminhos possíveis (estrutura real pode variar):
    // 1) bill.order_baskets → orders
    // 2) session.order_baskets → orders (legado / algumas rotas)
    // 3) bill.orders direto (alguns tenants retornam assim)
    const collectOrders = (): any[] => {
      const fromBills = (Array.isArray(session.bills) ? session.bills : []).flatMap((bill: any) => {
        if (!bill) return []
        if (Array.isArray(bill.order_baskets)) {
          return bill.order_baskets.flatMap((b: any) => Array.isArray(b?.orders) ? b.orders : [])
        }
        if (Array.isArray(bill.orders)) return bill.orders
        return []
      })
      if (fromBills.length > 0) return fromBills

      const fromSession = Array.isArray((session as any).order_baskets)
        ? (session as any).order_baskets.flatMap((b: any) => Array.isArray(b?.orders) ? b.orders : [])
        : []
      return fromSession
    }

    ;(Array.isArray(session.bills) ? session.bills : []).forEach((bill: any) => {
      if (!bill) return
      totalRevenue += parseFloat(bill.total_price ?? '0')
      totalWithService += parseFloat(bill.total_service_price ?? '0')
      totalDiscounts += parseFloat(bill.total_discount ?? '0')
    })

    collectOrders().forEach((order: any) => {
      const products = Array.isArray(order?.order_products) ? order.order_products : []
      products.forEach((p: any) => {
        const amount = Number(p?.amount ?? 0)
        if (!Number.isNaN(amount)) totalProductsSold += amount
      })
    })
  })

  return {
    total_sessions: safeSessions.length,
    total_products_sold: totalProductsSold,
    total_revenue: totalRevenue,
    total_with_service: totalWithService,
    total_payments: totalPaymentsCount,
    total_discounts: totalDiscounts,
    channels_found: Array.from(channels),
    nfce_available: nfceCount,
    period_start: periodStart,
    period_end: periodEnd
  }
}

// -------------------------------------------------------------------
// HELPER — converte data de Brasília para UTC-0 (para enviar à API)
// -------------------------------------------------------------------
export function brasiliaToUTC(dateStr: string): string {
  // Se a entrada for apenas "YYYY-MM-DD", assume meia-noite em Brasília (UTC-3)
  // Para converter para UTC-0, adicionamos 3 horas.
  const date = new Date(dateStr)
  
  // Garantir que estamos tratando como a data local se for apenas YYYY-MM-DD
  if (dateStr.length === 10) {
    // Adiciona o timezone offset ou apenas define as horas explicitamente
    // Para simplificar: Date(dateStr) em um sistema BR já cria em UTC-3 ou similar.
    // Mas a API quer UTC-0 puro.
    // Se hoje é 2024-01-01 00:00 BRT, isso é 2024-01-01 03:00 UTC.
    date.setHours(date.getHours() + 3)
  }

  return date.toISOString().split('.')[0] + 'Z' // Garante formato ISO sem milisegundos e com Z
}

