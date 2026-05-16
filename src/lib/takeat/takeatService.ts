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

const BASE_URL     = process.env.TAKEAT_BASE_URL || 'https://backend-pdv.takeat.app'
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
  // API pode retornar array puro ou wrapper { data: [...] } / { sessions: [...] } / { table_sessions: [...] }
  if (Array.isArray(data)) return data as TakeatTableSession[]
  if (Array.isArray(data?.data)) return data.data as TakeatTableSession[]
  if (Array.isArray(data?.sessions)) return data.sessions as TakeatTableSession[]
  if (Array.isArray(data?.table_sessions)) return data.table_sessions as TakeatTableSession[]
  return []
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

  const list = Array.isArray(sessions) ? sessions : []

  list.forEach((session: TakeatTableSession) => {
    if (!session) return
    if (session.channel?.name) channels.add(session.channel.name)
    if (session.nfce) nfceCount++
    if (Array.isArray(session.payments)) totalPaymentsCount += session.payments.length

    ;(Array.isArray(session.bills) ? session.bills : []).forEach((bill) => {
      if (!bill) return
      totalRevenue += parseFloat(bill.total_price || '0')
      totalWithService += parseFloat(bill.total_service_price || '0')
      totalDiscounts += parseFloat(bill.total_discount || '0')

      ;(Array.isArray(bill.order_baskets) ? bill.order_baskets : []).forEach((basket) => {
        ;(Array.isArray(basket?.orders) ? basket.orders : []).forEach((order) => {
          ;(Array.isArray(order?.order_products) ? order.order_products : []).forEach((product) => {
            totalProductsSold += Number(product?.amount) || 0
          })
        })
      })
    })
  })

  return {
    total_sessions: list.length,
    total_products_sold: totalProductsSold,
    total_revenue: Number(totalRevenue.toFixed(2)),
    total_with_service: Number(totalWithService.toFixed(2)),
    total_payments: totalPaymentsCount,
    total_discounts: Number(totalDiscounts.toFixed(2)),
    channels_found: Array.from(channels),
    nfce_available: nfceCount,
    period_start: periodStart,
    period_end: periodEnd
  }
}

// -------------------------------------------------------------------
// HELPER — converte data de Brasília para UTC-0 (para enviar à API)
// -------------------------------------------------------------------
export function brasiliaToUTC(dateStr: string, boundary: 'start' | 'end' = 'start'): string {
  if (!dateStr || dateStr.length < 10) {
    throw new Error(`Data inválida recebida: "${dateStr}"`)
  }

  // Forçamos o parsing tratando como data local para evitar confusão de timezone
  // YYYY-MM-DD
  const parts = dateStr.split('-').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Formato de data inválido: "${dateStr}"`)
  }

  // Meses no JS são 0-indexados
  const date = new Date(parts[0], parts[1] - 1, parts[2])
  
  if (isNaN(date.getTime())) {
    throw new Error(`Data impossível: "${dateStr}"`)
  }

  if (boundary === 'start') {
    // 00:00:00 Brasília = 03:00:00 UTC
    // Usamos Date.UTC para garantir que o resultado seja determinístico
    return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 3, 0, 0, 0)).toISOString().split('.')[0] + 'Z'
  } else {
    // 23:59:59 Brasília = 02:59:59 UTC do dia seguinte
    return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + 1, 3, 0, 0, -1)).toISOString().split('.')[0] + 'Z'
  }
}

