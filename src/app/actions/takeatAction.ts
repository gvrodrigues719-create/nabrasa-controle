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
export async function getTakeatDataAction(startDate: string, endDate: string): Promise<{
  success: boolean
  data?: {
    sessions: TakeatTableSession[]
    summary: TakeatPeriodSummary
  }
  error?: string
  code?: 'MISSING_CONFIG' | 'AUTH_ERROR' | 'FETCH_ERROR' | 'INVALID_RANGE'
}> {
  try {
    // 1. Verificação de Configuração
    const email = process.env.TAKEAT_EMAIL
    const password = process.env.TAKEAT_PASSWORD
    if (!email || !password) {
      return { success: false, error: 'Configuração pendente: TAKEAT_EMAIL ou PASSWORD ausentes.', code: 'MISSING_CONFIG' }
    }

    // 2. Validação de Intervalo (3 dias)
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays > 3) {
      return { success: false, error: 'A API Takeat permite no máximo 3 dias por consulta.', code: 'INVALID_RANGE' }
    }

    // 3. Autenticação (Cache/Refresh)
    let token: string
    try {
      token = await getOrRenewToken()
    } catch (err: any) {
      console.error('[TakeatAction] Erro na autenticação:', err.message)
      return { success: false, error: 'Falha na autenticação com a API Takeat.', code: 'AUTH_ERROR' }
    }

    // 4. Chamada Real ao Endpoint
    console.info(`[TakeatAction] Buscando sessões: ${startDate} até ${endDate}`)
    
    const startUTC = brasiliaToUTC(startDate)
    const endUTC = brasiliaToUTC(endDate)

    const sessions = await getTableSessions(token, {
      start_date: startUTC,
      end_date: endUTC
    })

    // 5. Agregação do Resumo
    const summary = aggregatePeriodSummary(sessions, startDate, endDate)

    return {
      success: true,
      data: {
        sessions,
        summary
      }
    }

  } catch (err: any) {
    console.error('[TakeatAction] Erro inesperado:', err.message)
    return { 
      success: false, 
      error: `Erro ao buscar dados: ${err.message}`, 
      code: 'FETCH_ERROR' 
    }
  }
}

