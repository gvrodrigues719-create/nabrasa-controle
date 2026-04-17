'use server'

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// CONSTANTES DE NEGÓCIO (Centralizadas para fácil ajuste futuro)
const PENALTIES = {
    MISSING_CHECKLIST: 15,
    STUCK_SESSION: 10,
    ITEM_ZEROED: 5,
    REPORTED_LOSS: 2, // Penalidade leve para incentivo à transparência
}

const LIMITS = {
    STUCK_SESSION_HOURS: 4,
    OPENING_HOUR_CUTOFF: 11, // 11h da manhã
    CLOSING_HOUR_CUTOFF: 23, // 23h da noite
}

export type Leak = {
    id: string
    type: 'checklist' | 'session' | 'rupture' | 'reported_loss'
    severity: 'critical' | 'warning' | 'info'
    label: string
    penalty: number
}

/**
 * Calcula a Saúde da Operação (Job 1) com base em dados reais do sistema.
 */
export async function getOperationalHealthAction() {
    try {
        const now = new Date()
        const startOfToday = new Date()
        startOfToday.setHours(0, 0, 0, 0)
        
        const leaks: Leak[] = []
        let currentScore = 100

        // 1. DETECÇÃO DE CHECKLISTS PENDENTES (Vazamento de Padrão)
        const { data: templates } = await supabase
            .from('checklist_templates')
            .select('id, name, context')
            .eq('active', true)
            .in('context', ['opening', 'closing'])

        if (templates) {
            const currentHour = now.getHours()
            
            for (const template of templates) {
                // Se for abertura e já passou das 11h
                const isOpeningLate = template.context === 'opening' && currentHour >= LIMITS.OPENING_HOUR_CUTOFF
                const isClosingLate = template.context === 'closing' && currentHour >= LIMITS.CLOSING_HOUR_CUTOFF

                if (isOpeningLate || isClosingLate) {
                    const { data: session } = await supabase
                        .from('checklist_sessions')
                        .select('id, status')
                        .eq('template_id', template.id)
                        .eq('status', 'completed')
                        .gte('completed_at', startOfToday.toISOString())
                        .maybeSingle()

                    if (!session) {
                        leaks.push({
                            id: `checklist-${template.id}`,
                            type: 'checklist',
                            severity: 'critical',
                            label: `Pendente: ${template.name}`,
                            penalty: PENALTIES.MISSING_CHECKLIST
                        })
                        currentScore -= PENALTIES.MISSING_CHECKLIST
                    }
                }
            }
        }

        // 2. DETECÇÃO DE SESSÕES TRAVADAS (Vazamento de Fluxo)
        const fourHoursAgo = new Date(now.getTime() - LIMITS.STUCK_SESSION_HOURS * 60 * 60 * 1000).toISOString()
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
        
        const { data: stuckSessions } = await supabase
            .from('count_sessions')
            .select('id, groups(name)')
            .eq('status', 'in_progress')
            .lt('started_at', fourHoursAgo)
            .gte('started_at', startOfToday.toISOString())

        if (stuckSessions) {
            stuckSessions.forEach(s => {
                const groupName = (s.groups as any)?.name || 'Setor'
                leaks.push({
                    id: `session-${s.id}`,
                    type: 'session',
                    severity: 'warning',
                    label: `Trancado: ${groupName}`,
                    penalty: PENALTIES.STUCK_SESSION
                })
                currentScore -= PENALTIES.STUCK_SESSION
            })
        }

        // 3. DETECÇÃO DE PERDAS REPORTADAS (Vazamento Conhecido) - NOVO NO JOB 2
        const { data: reportedLosses } = await supabase
            .from('inventory_losses')
            .select('id, item_id, items(name), category')
            .gte('created_at', yesterday)

        const reportedItemIds = new Set<string>()

        if (reportedLosses) {
            reportedLosses.forEach(rl => {
                const itemName = (rl.items as any)?.name || 'Item'
                reportedItemIds.add(rl.item_id)
                leaks.push({
                    id: `loss-${rl.id}`,
                    type: 'reported_loss',
                    severity: 'info',
                    label: `Relatado: ${itemName} (${rl.category})`,
                    penalty: PENALTIES.REPORTED_LOSS
                })
                currentScore -= PENALTIES.REPORTED_LOSS
            })
        }

        // 4. DETECÇÃO DE RUPTURA (is_zeroed na última contagem - Vazamento Oculto)
        // Buscamos itens zerados em sessões concluídas nas últimas 24h
        const { data: zeroedItems } = await supabase
            .from('count_session_items')
            .select('item_id, items(name)')
            .eq('is_zeroed', true)
            .gte('created_at', yesterday)

        if (zeroedItems) {
            // Filtramos itens que JÁ FORAM REPORTADOS para não punir em dobro
            const hiddenRuptures = zeroedItems.filter(zi => !reportedItemIds.has(zi.item_id))
            
            hiddenRuptures.forEach(zi => {
                const itemName = (zi.items as any)?.name || 'Item'
                leaks.push({
                    id: `rupture-${zi.item_id}`,
                    type: 'rupture',
                    severity: 'info',
                    label: `Ruptura: ${itemName}`,
                    penalty: PENALTIES.ITEM_ZEROED
                })
                currentScore -= PENALTIES.ITEM_ZEROED
            })
        }

        const totalPenalty = 100 - currentScore

        return {
            success: true,
            score: Math.max(0, Math.min(100, currentScore)),
            penalidade_total: Math.max(0, totalPenalty),
            vazamentos_ativos: leaks.length,
            leaks: leaks.slice(0, 4) // Mostrar apenas os 4 mais relevantes
        }
    } catch (err: any) {
        console.error('[Efficiency] Erro no motor de saúde:', err.message)
        return { 
            success: false, 
            error: err.message, 
            score: 100, 
            penalidade_total: 0, 
            vazamentos_ativos: 0, 
            leaks: [] 
        }
    }
}
