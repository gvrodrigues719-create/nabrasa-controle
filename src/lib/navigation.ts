/**
 * Utilitários de Navegação Contextual (MOC Navigation)
 * Objetivo: Garantir retorno seguro e coerente entre fluxos operacionais.
 */

/**
 * Verifica se um caminho de retorno é uma rota interna segura.
 * Evita redirecionamentos abertos ou para domínios externos.
 */
export function isSafeInternalPath(path: string | null | undefined): boolean {
    if (!path) return false;
    
    // Deve começar com / e não conter // nem esquemas (ex: http:)
    return path.startsWith('/') && !path.startsWith('//') && !path.includes(':');
}

/**
 * Resolve o destino de retorno a partir de um parâmetro ou usa um fallback.
 * Nomeado como getSafeReturnTo para compatibilidade sistêmica.
 */
export function getSafeReturnTo(returnTo: string | null | undefined, fallback: string): string {
    if (isSafeInternalPath(returnTo)) {
        return returnTo as string;
    }
    return fallback;
}

/**
 * Helper para construir URLs operacionais preservando o contexto de retorno.
 */
export function appendReturnTo(basePath: string, returnTo: string | null | undefined): string {
    if (!returnTo || !isSafeInternalPath(returnTo)) return basePath;
    const separator = basePath.includes('?') ? '&' : '?';
    return `${basePath}${separator}returnTo=${encodeURIComponent(returnTo)}`;
}
