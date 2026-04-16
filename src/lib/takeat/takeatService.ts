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

import { MOCK_SESSIONS, MOCK_SUMMARY } from './takeatMockData'

const BASE_URL     = 'https://backend-pdv.takeat.app'
const BASE_API     = `${BASE_URL}/api/v1`
const MAX_DAYS     = 3  // limite por consulta conforme documentação

// -------------------------------------------------------------------
// AUTENTICAÇÃO
// POST /public/api/sessions
// -------------------------------------------------------------------
export async function authenticate(payload: TakeatAuthPayload): Promise<TakeatAuthResponse> {
  // TODO: substituir por chamada real
  // const res = await fetch(`${BASE_URL}/public/api/sessions`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(payload),
  // })
  // if (!res.ok) throw new Error(`Takeat auth error: ${res.status}`)
  // return res.json()

  throw new Error('[TakeatService] authenticate() — integração real não implementada ainda.')
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

  // TODO: substituir por chamada real
  // const url = new URL(`${BASE_API}/table-sessions`)
  // url.searchParams.set('start_date', params.start_date)
  // url.searchParams.set('end_date', params.end_date)
  // const res = await fetch(url.toString(), {
  //   headers: { Authorization: `Bearer ${token}` }
  // })
  // if (!res.ok) throw new Error(`Takeat sessions error: ${res.status}`)
  // return res.json()

  // MOCK — retorna dados estruturados para demonstração
  console.info('[TakeatService] Usando mock data — integração real pendente.')
  return MOCK_SESSIONS
}

// -------------------------------------------------------------------
// MÉTODOS DE PAGAMENTO
// GET /payment-methods
// -------------------------------------------------------------------
export async function getPaymentMethods(token: string) {
  // TODO: substituir por chamada real
  // const res = await fetch(`${BASE_API}/payment-methods`, {
  //   headers: { Authorization: `Bearer ${token}` }
  // })
  // return res.json()

  console.info('[TakeatService] getPaymentMethods() — mock.')
  return []
}

// -------------------------------------------------------------------
// AGREGAÇÃO — calcula resumo do período a partir das sessões
// Essa função opera sobre dados locais, não chama a API diretamente
// -------------------------------------------------------------------
export function aggregatePeriodSummary(
  sessions: TakeatTableSession[],
  periodStart: string,
  periodEnd: string
): TakeatPeriodSummary {
  // TODO: implementar agregação real quando integração estiver ativa
  // Por hora retorna o mock summary para demonstração
  console.info('[TakeatService] aggregatePeriodSummary() — mock.')
  return MOCK_SUMMARY
}

// -------------------------------------------------------------------
// HELPER — converte data de Brasília para UTC-0 (para enviar à API)
// -------------------------------------------------------------------
export function brasiliaToUTC(dateStr: string): string {
  // Brasília = UTC-3
  // TODO: usar biblioteca de timezone (date-fns-tz) para produção
  const date = new Date(dateStr)
  date.setHours(date.getHours() + 3)
  return date.toISOString()
}
