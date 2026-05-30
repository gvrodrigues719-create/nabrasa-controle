'use server'

import { createClient } from '@supabase/supabase-js'
import { getStartOfOperationalWeek } from '@/lib/dateUtils'

function getServiceSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return null
    return createClient(url, key)
}

/**
 * Registra a conclusão de uma missão operacional.
 * Distribui Pontos (Gamification Ranking) e Moedas (Wallet Ledger).
 * 
 * Executa em Service Role para processamento server-side assíncrono.
 */
export async function triggerMissionValidationAction(
    userId: string,
    conceptKey: string,
    sourceId: string,
    evidenceUrl?: string
) {
    try {
        const supabase = getServiceSupabase()
        if (!supabase) throw new Error('Supabase Service Role não configurado')

        // 1. Busca o template da missão
        const { data: template, error: tErr } = await supabase
            .from('mission_templates')
            .select('*')
            .eq('concept_key', conceptKey)
            .single()

        if (tErr || !template) return { success: false, error: 'Missão não mapeada ou desativada.' }

        // 2. Trava simples antifraude (Verifica se já não completou a missão DIÁRIA/ÚNICA com este source_id)
        // Por simplicidade na Demo, verificamos só source_id ou existência pendente hoje
        const { data: existingRun } = await supabase
            .from('mission_runs')
            .select('id, status')
            .eq('mission_template_id', template.id)
            .eq('user_id', userId)
            .eq('source_id', sourceId)
            .maybeSingle()
        
        if (existingRun && existingRun.status === 'completed') {
            return { success: true, duplicated: true } // Já foi recompensado
        }

        // 3. Definir estado 
        // Se a missão EXIGE evidência e não veio, falha a execução total (rejeita o bonus). 
        // Na nossa Modelagem Padrão: Missões podem ser concluídas de imediato se não exigirem aprovação complexa
        let finalStatus = 'completed'
        let pointsToAward = template.base_points
        let coinsToAward = template.base_coins

        if (evidenceUrl) {
            finalStatus = 'awaiting_approval' // Será validado pelo admin dps pra ganhar bonus total
            // Quando envia foto, ele ganha o Base Agota e aguarda aprovação para o Bônus
        } else if (template.requires_evidence && !evidenceUrl) {
            // Se exige foto e não mandou, não considera completa a parte bônus
            // Ganha apenas o base (Na nossa logica atual do app)
        }

        // 4. Grava o Run
        const { data: run, error: rErr } = await supabase
            .from('mission_runs')
            .insert([{
                mission_template_id: template.id,
                user_id: userId,
                status: finalStatus,
                evidence_url: evidenceUrl || null,
                source_id: sourceId,
                points_awarded: pointsToAward,
                coins_awarded: coinsToAward,
                completed_at: finalStatus === 'completed' ? new Date().toISOString() : null
            }])
            .select('id')
            .single()

        if (rErr) throw new Error(rErr.message)

        // 5. Distribui a Economia se 'completed'
        if (finalStatus === 'completed') {
            // Pontos -> Vai pro Gamification Events para Rankin Semanal e XP Total
            if (pointsToAward > 0) {
                await supabase.from('gamification_events').insert([{
                    user_id: userId,
                    source_type: conceptKey,
                    source_id: run.id,
                    points: pointsToAward,
                    reason: `Recompensa da Missão: ${template.title}`
                }])
            }

            // Moedas -> Vai pro Ledger de Carteira (Para a Lojinha)
            if (coinsToAward > 0) {
                await supabase.from('wallet_transactions').insert([{
                    user_id: userId,
                    type: 'earned',
                    amount: coinsToAward,
                    reference_id: run.id
                }])
            }
        }

        return { success: true, status: finalStatus, coinsEarned: finalStatus === 'completed' ? coinsToAward : 0 }

    } catch (error: any) {
        console.error('[Missions] Falha na validação:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Retorna as Missões do Dia para o painel do Operador MOC
 */
export async function getDailyMissionsAction(userId: string) {
    try {
        const supabase = getServiceSupabase()
        if (!supabase) return { success: false, error: 'Database unavailable' }

        // Pegamos todos os templates
        const { data: templates } = await supabase.from('mission_templates').select('*')
        
        // Pegamos as runs do dia de hoje para o usuário
        const todayStart = new Date()
        todayStart.setUTCHours(3, 0, 0, 0) // Anchor BRT Start
        
        const { data: runs } = await supabase
            .from('mission_runs')
            .select('mission_template_id, status, evidence_url, coins_awarded, bonus_coins')
            .eq('user_id', userId)
            .gte('created_at', todayStart.toISOString())

        if (!templates) return { success: true, list: [] }

        // Mesclamos: Cada template da casa tem o seu status atrelado
        const list = templates.map(t => {
            const myRun = runs?.find(r => r.mission_template_id === t.id)
            return {
                id: t.id,
                concept_key: t.concept_key,
                title: t.title,
                description: t.description,
                base_coins: t.base_coins,
                requires_evidence: t.requires_evidence,
                status: myRun ? myRun.status : 'pending',
                coins_awarded: myRun ? myRun.coins_awarded : 0
            }
        })

        return { success: true, list }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
