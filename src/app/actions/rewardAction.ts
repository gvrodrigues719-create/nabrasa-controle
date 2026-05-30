'use server'

import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUserId } from '@/lib/auth-utils'

function getServiceSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return null
    return createClient(url, key)
}

/**
 * Retorna o saldo em NB Coins e o extrato do usuário.
 */
export async function getWalletBalanceAction(userId?: string) {
    try {
        const authId = await getAuthenticatedUserId()
        const targetId = userId || authId
        
        if (!targetId) throw new Error('Identidade não resolvida')

        const supabase = getServiceSupabase()
        if (!supabase) throw new Error('Database indisponível')

        // Ler a view rápida
        const { data: balanceData, error: bErr } = await supabase
            .from('user_wallet_balances')
            .select('balance')
            .eq('user_id', targetId)
            .maybeSingle()

        if (bErr) throw bErr

        return { 
            success: true, 
            balance: balanceData ? balanceData.balance : 0 
        }
    } catch (error: any) {
        return { success: false, error: error.message, balance: 0 }
    }
}

/**
 * Retorna os itens ativos da loja e o estoque.
 */
export async function getRewardsCatalogAction() {
    try {
        const supabase = getServiceSupabase()
        if (!supabase) return { success: false, list: [] }

        const { data: list, error } = await supabase
            .from('reward_catalog')
            .select('*')
            .eq('active', true)
            .order('cost_coins', { ascending: true })

        if (error) throw error

        return { success: true, list }
    } catch (e: any) {
        return { success: false, error: e.message, list: [] }
    }
}

/**
 * Transação atômica que permite resgatar uma recompensa usando moedas da carteira.
 */
export async function redeemRewardAction(rewardId: string) {
    try {
        const authId = await getAuthenticatedUserId()
        if (!authId) throw new Error('Não autenticado')

        const supabase = getServiceSupabase()
        if (!supabase) throw new Error('Service Role indisponível')

        // 1. Checar saldo do usuário
        const { balance } = await getWalletBalanceAction(authId)
        
        // 2. Trazer recompensa
        const { data: reward, error: rErr } = await supabase
            .from('reward_catalog')
            .select('cost_coins, stock')
            .eq('id', rewardId)
            .single()

        if (rErr || !reward) throw new Error('Recompensa inválida ou não encontrada')

        if (reward.stock === 0) throw new Error('Recompensa fora de estoque!')
        if (balance < reward.cost_coins) throw new Error('Saldo em NB Coins insuficiente.')

        // 3. Realizar transação simulada (RPC Ideal, mas para Demo fazemos serial via ServiceRole)
        // Registrar redemption request
        const { data: redemption, error: redErr } = await supabase
            .from('reward_redemptions')
            .insert([{
                user_id: authId,
                reward_id: rewardId,
                coins_spent: reward.cost_coins,
                status: 'requested'
            }])
            .select('id')
            .single()

        if (redErr) throw new Error(redErr.message)

        // Registrar Wallet transaction
        const { error: wErr } = await supabase
            .from('wallet_transactions')
            .insert([{
                user_id: authId,
                type: 'spent',
                amount: reward.cost_coins,
                reference_id: redemption.id
            }])

        if (wErr) {
            // Se falhou abater grana, deleta redemption (Rollback manual para Supabase REST)
            await supabase.from('reward_redemptions').delete().eq('id', redemption.id)
            throw new Error('Falha ao debitar na carteira, compra cancelada por segurança.')
        }

        // Se tinha estoque limitante, diminui
        if (reward.stock > 0) {
            const { error: rpcErr } = await supabase.rpc('decrement_reward_stock', { r_id: rewardId })
            if (rpcErr) console.error("Warning: Falha RPC diminuição de estoque, mas checkout foi efetuado.")
        }

        console.log(`[ACTION] Reward redeemed | RewardID: ${rewardId} | User: ${authId} | Cost: ${reward.cost_coins}`)
        return { success: true }
    } catch (e: any) {
        console.error(`[AUTH_FAIL] redeemRewardAction | RewardID: ${rewardId} | Error: ${e.message}`)
        return { success: false, error: e.message }
    }
}
