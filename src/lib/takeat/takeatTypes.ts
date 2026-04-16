/**
 * Takeat API — Tipos confirmados pela documentação
 * Base: https://backend-pdv.takeat.app/api/v1
 *
 * Estes tipos refletem a estrutura ESPERADA do retorno da API.
 * Campos marcados com "?" são opcionais conforme a documentação.
 * Estrutura baseada no retorno de GET /table-sessions.
 */

// -------------------------------------------------------------------
// AUTENTICAÇÃO
// POST /public/api/sessions
// -------------------------------------------------------------------
export type TakeatAuthPayload = {
  email: string
  password: string
}

export type TakeatAuthResponse = {
  token: string // JWT — expira em 15 dias
}

// -------------------------------------------------------------------
// QUERY PARAMS — /table-sessions
// Intervalo máximo: 3 dias por consulta
// Timezone da API: UTC-0 (Brasília = UTC-3, ajuste necessário)
// -------------------------------------------------------------------
export type TakeatTableSessionsParams = {
  start_date: string // ISO 8601 — UTC-0
  end_date: string   // ISO 8601 — UTC-0
}

// -------------------------------------------------------------------
// ESTRUTURA PRINCIPAL — table-session / comanda
// -------------------------------------------------------------------
export type TakeatTableSession = {
  id: string
  key: string                  // identificador da comanda/mesa
  status: string               // ex: 'finished', 'open'
  channel: TakeatChannel
  created_at: string
  finished_at?: string
  buyer?: TakeatBuyer
  waiter?: TakeatWaiter
  bills: TakeatBill[]
  payments: TakeatPayment[]
  order_baskets: TakeatOrderBasket[]
  nfce?: TakeatNfce
}

export type TakeatChannel = {
  id: string
  name: string                 // ex: 'Mesa', 'Delivery', 'Balcão'
}

export type TakeatBuyer = {
  id?: string
  name?: string
  phone?: string
}

export type TakeatWaiter = {
  id?: string
  name?: string
}

// -------------------------------------------------------------------
// CONTA / BILL
// Hierarquia: bill → order_baskets → orders → order_products
// -------------------------------------------------------------------
export type TakeatBill = {
  id: string
  total_price: string          // string decimal — ex: "152.90"
  total_service_price: string  // com taxa de serviço
  total_discount: string
  status: string
  order_baskets: TakeatOrderBasket[]
}

// -------------------------------------------------------------------
// CESTA DE PEDIDO / ORDER BASKET
// -------------------------------------------------------------------
export type TakeatOrderBasket = {
  id: string
  status: string
  created_at: string
  orders: TakeatOrder[]
}

// -------------------------------------------------------------------
// PEDIDO / ORDER
// -------------------------------------------------------------------
export type TakeatOrder = {
  id: string
  status: string
  total_price: string
  created_at: string
  order_products: TakeatOrderProduct[]
}

// -------------------------------------------------------------------
// ITEM VENDIDO / ORDER PRODUCT
// -------------------------------------------------------------------
export type TakeatOrderProduct = {
  id: string
  name: string
  amount: number
  price: string
  total_price: string
  complements?: TakeatComplement[]
}

// -------------------------------------------------------------------
// COMPLEMENTO
// -------------------------------------------------------------------
export type TakeatComplement = {
  id: string
  name: string
  amount: number
  price: string
}

// -------------------------------------------------------------------
// PAGAMENTO
// -------------------------------------------------------------------
export type TakeatPayment = {
  id: string
  payment_method: TakeatPaymentMethod
  value: string
  created_at: string
}

export type TakeatPaymentMethod = {
  id: string
  name: string                 // ex: 'Crédito', 'Débito', 'PIX', 'Dinheiro'
}

// -------------------------------------------------------------------
// NFC-e
// -------------------------------------------------------------------
export type TakeatNfce = {
  id?: string
  status?: string
  number?: string
  issued_at?: string
}

// -------------------------------------------------------------------
// RESUMO AGREGADO — para exibição no painel
// Calculado a partir dos dados brutos, não retornado diretamente pela API
// -------------------------------------------------------------------
export type TakeatPeriodSummary = {
  total_sessions: number
  total_products_sold: number
  total_revenue: number         // sem serviço
  total_with_service: number
  total_payments: number
  total_discounts: number
  channels_found: string[]
  nfce_available: number
  period_start: string
  period_end: string
}
