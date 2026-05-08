/**
 * Helpers específicos para a engine de contagem do MOC
 */

/**
 * Verifica se a unidade de medida é do tipo inteiro (não aceita decimais)
 */
export function isIntegerUnit(unit: string): boolean {
    if (!unit) return false;
    const normalized = unit.toLowerCase().trim();
    // Integer units: all non-decimal units used across lojas and Cozinha Central
    return [
        // Original loja units
        'un', 'und', 'cx', 'pct',
        // Cozinha Central units
        'unid', 'rolo', 'amarrado', 'peça', 'peca', 'porção', 'porcao', 'caixinha',
    ].includes(normalized);
}

/**
 * Calcula a porcentagem de progresso da contagem
 */
export function calculateCountProgress(total: number, pending: number): number {
    if (total === 0) return 0;
    return ((total - pending) / total) * 100;
}

/**
 * Retorna a data âncora do ciclo atual (Brasília Time)
 * Extraído literalmente de countAction.ts para manter compatibilidade
 */
export function getCycleAnchorDate(snapshotStartedAt?: string | null): string {
    const brDateParts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
    
    // Meia-noite BRT = 03:00 UTC
    const startOfDayBR = `${brDateParts}T03:00:00Z`;
    
    return snapshotStartedAt || startOfDayBR;
}
