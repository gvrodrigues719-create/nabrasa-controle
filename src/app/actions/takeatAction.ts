'use server'

/**
 * TakeatAction — Lógica de servidor para o Módulo de Vendas
 */

/**
 * Verifica se as credenciais da Takeat estão configuradas no ambiente (.env.local)
 * Retorna true apenas se EMAIL e PASSWORD estiverem presentes.
 */
export async function checkTakeatConfigAction(): Promise<boolean> {
  const email = process.env.TAKEAT_EMAIL
  const password = process.env.TAKEAT_PASSWORD

  // Retorna true se ambos existirem e não forem vazios
  const isConfigured = !!(email && password)
  
  console.info(`[TakeatAction] Verificando configuração: ${isConfigured ? 'OK' : 'PENDENTE'}`)
  
  return isConfigured
}
