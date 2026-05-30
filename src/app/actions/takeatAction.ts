'use server'

import {
  authenticate,
  getTableSessions,
  aggregatePeriodSummary,
  brasiliaToUTC
} from '@/lib/takeat/takeatService'
import type { TakeatTableSession, TakeatPeriodSummary } from '@/lib/takeat/takeatTypes'

/**
 * TakeatAction — Lógica de servidor para o Módulo de Vendas
 */

// Cache de token em memória (Server-side singleton)
// Em produção com múltiplas instâncias, isso deveria estar no Redis/Database.
// Como o token dura 15 dias, o cache em memória já reduz drasticamente o número de logins.
let cachedToken: string | null = null
let tokenExpiry: number | null = null

/**
 * Verifica se as credenciais da Takeat estão configuradas no ambiente (.env.local)
 * Retorna true apenas se EMAIL e PASSWORD estiverem presentes.
 */
export async function checkTakeatConfigAction(): Promise<boolean> {
  const email = process.env.TAKEAT_EMAIL
  const password = process.env.TAKEAT_PASSWORD

  const isConfigured = !!(email && password)
  console.info(`[TakeatAction] Verificando configuração: ${isConfigured ? 'OK' : 'PENDENTE'}`)
  
  return isConfigured
}

/**
 * Obtém ou renova o token JWT da Takeat
 */
async function getOrRenewToken(): Promise<string> {
  const now = Date.now()
  
  // Se temos token e ele não expirou (margem de segurança de 1 dia)
  if (cachedToken && tokenExpiry && now < tokenExpiry - (24 * 60 * 60 * 1000)) {
    console.info('[TakeatAction] Usando token em cache.')
    return cachedToken
  }

  const email = process.env.TAKEAT_EMAIL
  const password = process.env.TAKEAT_PASSWORD

  if (!email || !password) {
    throw new Error('Credenciais da Takeat não configuradas no servidor.')
  }

  console.info('[TakeatAction] Obtendo novo token da API Takeat...')
  const authResponse = await authenticate({ email, password })
  
  cachedToken = authResponse.token
  // A documentação diz 15 dias, vamos colocar 14 dias para segurança
  tokenExpiry = now + (14 * 24 * 60 * 60 * 1000)
  
  return cachedToken
}

/**
 * Action principal para buscar dados reais da Takeat
 */
export async function getTakeatDataAction(
  startDate: string, 
  endDate: string,
  unitId?: string
): Promise<{
  success: boolean
  data?: {
    sessions: TakeatTableSession[]
    summary: TakeatPeriodSummary
  }
  error?: string
  code?: 'MISSING_CONFIG' | 'AUTH_ERROR' | 'FETCH_ERROR' | 'INVALID_RANGE' | 'INVALID_INPUT'
}> {
  const startTime = Date.now()
  try {
    // 1. Verificação de Entrada Básica
    if (!startDate || !endDate) {
      return { success: false, error: 'As datas de início e fim são obrigatórias.', code: 'INVALID_INPUT' }
    }

    console.info(`[TakeatAction] Solicitação recebida: Periodo ${startDate} a ${endDate} | Unidade: ${unitId || 'Todas'}`)

    // 2. Verificação de Configuração
    const email = process.env.TAKEAT_EMAIL
    const password = process.env.TAKEAT_PASSWORD
    if (!email || !password) {
      console.warn('[TakeatAction] TAKEAT_EMAIL ou TAKEAT_PASSWORD não configurados.')
      return { success: false, error: 'Configuração pendente no servidor.', code: 'MISSING_CONFIG' }
    }

    // 3. Validação de Intervalo (3 dias)
    const startObj = new Date(startDate)
    const endObj = new Date(endDate)
    
    if (isNaN(startObj.getTime()) || isNaN(endObj.getTime())) {
      return { success: false, error: 'Formato de data inválido.', code: 'INVALID_INPUT' }
    }

    if (endObj < startObj) {
      return { success: false, error: 'Data final deve ser maior ou igual à data inicial.', code: 'INVALID_RANGE' }
    }

    const diffTime = Math.abs(endObj.getTime() - startObj.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    // A API Takeat é rígida com 3 dias. Se diffDays for 3.1, já pode dar erro.
    // Usando uma margem pequena para o cálculo de dias
    if (diffDays > 3) {
      return { success: false, error: 'A API Takeat permite no máximo 3 dias por consulta.', code: 'INVALID_RANGE' }
    }

    // 4. Autenticação (Cache/Refresh)
    let token: string
    try {
      token = await getOrRenewToken()
    } catch (err: any) {
      console.error('[TakeatAction] Erro na autenticação:', err.message)
      return { success: false, error: 'Falha na autenticação com a API Takeat.', code: 'AUTH_ERROR' }
    }

    // 5. Chamada Real ao Endpoint
    const startUTC = brasiliaToUTC(startDate, 'start')
    const endUTC = brasiliaToUTC(endDate, 'end')
    
    console.info(`[TakeatAction] Consultando API Takeat: ${startUTC} até ${endUTC}`)
    
    const sessions = await getTableSessions(token, {
      start_date: startUTC,
      end_date: endUTC
    })

    // 6. Agregação do Resumo
    const summary = aggregatePeriodSummary(sessions, startDate, endDate)
    const duration = Date.now() - startTime

    console.info(`[TakeatAction] Sucesso! ${sessions.length} sessões encontradas em ${duration}ms.`)

    return {
      success: true,
      data: {
        sessions,
        summary
      }
    }
  } catch (err: any) {
    const duration = Date.now() - startTime
    console.error(`[TakeatAction] Erro inesperado após ${duration}ms:`, err.message)
    
    // Se for um erro conhecido de dentro do brasiliaToUTC ou fetch
    return { 
      success: false, 
      error: err.message.includes('Fetch') ? 'Erro de comunicação com a API externa.' : err.message, 
      code: 'FETCH_ERROR' 
    }
  }
}

/**
 * Health-Check: Testa as credenciais e a conectividade com a API Takeat.
 */
export async function testTakeatConnectivityAction() {
  try {
    const email = process.env.TAKEAT_EMAIL
    const password = process.env.TAKEAT_PASSWORD
    if (!email || !password) return { success: false, error: 'Credenciais ausentes (.env)' }

    const res = await authenticate({ email, password })
    if (res.token) {
      return { success: true, message: 'Conectado com sucesso à Takeat!' }
    }
    return { success: false, error: 'Token não recebido' }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

