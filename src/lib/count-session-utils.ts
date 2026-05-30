/**
 * Utilitários para sessões de contagem — regras centralizadas.
 * Usar este arquivo em qualquer lugar que precise detectar sessão travada.
 */

const STUCK_THRESHOLD_HOURS = 8

/**
 * Retorna true se a sessão está possivelmente travada:
 * - status diferente de 'completed'
 * - iniciada há mais de STUCK_THRESHOLD_HOURS horas
 */
export function isCountSessionStuck(session: {
  status: string
  started_at: string | null
}): boolean {
  if (!session.started_at) return false
  if (session.status === 'completed') return false
  const startedAt = new Date(session.started_at)
  const threshold = new Date(Date.now() - STUCK_THRESHOLD_HOURS * 60 * 60 * 1000)
  return startedAt < threshold
}

/**
 * Calcula duração em minutos entre início e fim.
 * Retorna null se ainda não finalizada.
 */
export function countSessionDurationMin(
  startedAt: string | null,
  completedAt: string | null
): number | null {
  if (!startedAt || !completedAt) return null
  const start = new Date(startedAt)
  const end = new Date(completedAt)
  return Math.round((end.getTime() - start.getTime()) / 60000)
}

/**
 * Resolve label e cor do status de uma sessão.
 */
export function countSessionStatusLabel(session: {
  status: string
  started_at: string | null
}): { label: string; isStuck: boolean } {
  const isStuck = isCountSessionStuck(session)
  if (isStuck) return { label: 'Travada', isStuck: true }
  if (session.status === 'completed') return { label: 'Concluída', isStuck: false }
  return { label: 'Em Andamento', isStuck: false }
}
