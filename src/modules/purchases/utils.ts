/**
 * Utilitários do módulo de Compras — sem 'use server', pode ser importado em qualquer contexto.
 */

export type UserProfile = { id: string; role: string; name: string; primary_group_id: string | null; unit_id?: string | null }

/**
 * Resolve o store_id de um usuário.
 * - Gerente/Operator → unit_id (Loja real) ou primary_group_id
 * - Admin → usa explicitStoreId (passado manualmente na criação do pedido)
 *
 * Centralizado aqui para facilitar mudança futura (ex: múltiplas lojas por gerente).
 */
export function getUserStoreId(user: UserProfile, explicitStoreId?: string): string | null {
    if (user.role === 'admin' && explicitStoreId) return explicitStoreId
    return user.unit_id ?? user.primary_group_id ?? null
}
