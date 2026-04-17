/**
 * Retorna o início da semana operacional (Segunda-feira 03:00 UTC / 00:00 BRT)
 * Esta é a âncora oficial para Rank, Metas e Saúde Operacional.
 */
export function getStartOfOperationalWeek(): string {
    const now = new Date()
    const day = now.getUTCDay() // 0 (Sun), 1 (Mon), ..., 6 (Sat)
    
    // Ajuste para encontrar a Segunda-feira mais recente
    // Se hoje for Domingo (0), recua 6 dias. Se for Segunda (1), recua 0 dias.
    const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1)
    
    // Cria a data no UTC 03:00 (que é meia-noite no fuso de Brasília)
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff, 3, 0, 0, 0))
    
    // Se hoje for segunda mas antes das 03:00 UTC, tecnicamente ainda estamos na semana anterior
    if (now < start) {
        start.setUTCDate(start.getUTCDate() - 7)
    }
    
    return start.toISOString()
}

/**
 * Formata uma data ISO para exibição amigável no padrão brasileiro.
 */
export function formatWeeklyDate(isoString: string): string {
    const date = new Date(isoString)
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date)
}
