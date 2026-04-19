/**
 * Utilitário de Navegação Contextual
 * 
 * Este helper garante que o retorno para páginas via query param 'returnTo' 
 * seja seguro (apenas caminhos internos) e consistente.
 */

/**
 * Valida se um caminho é uma rota interna segura.
 * Impede redirecionamentos maliciosos para URLs externas.
 */
export function isSafeInternalPath(path: string | null | undefined): boolean {
    if (!path) return false;
    
    // Deve começar com / e não ser // (que indica protocolo)
    // Também não pode conter :// (protocolo absoluto)
    return path.startsWith('/') && !path.startsWith('//') && !path.includes('://');
}

/**
 * Resolve o destino de retorno baseado no parâmetro atual e um fallback.
 */
export function getSafeReturnTo(returnToParam: string | null | undefined, fallback: string): string {
    if (isSafeInternalPath(returnToParam)) {
        return returnToParam as string;
    }
    return fallback;
}

/**
 * Helper para anexar o returnTo a uma URL existente.
 */
export function appendReturnTo(url: string, returnTo: string): string {
    const divider = url.includes('?') ? '&' : '?';
    return `${url}${divider}returnTo=${encodeURIComponent(returnTo)}`;
}
