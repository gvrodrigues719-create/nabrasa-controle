'use server'

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PENALTIES = {
    MISSING_CHECKLIST: 15,
    STUCK_SESSION: 10,
    ITEM_ZEROED: 5,
    REPORTED_LOSS: 2,
}

const LIMITS = {
    STUCK_SESSION_HOURS: 4,
    OPENING_HOUR_CUTOFF: 11,
    CLOSING_HOUR_CUTOFF: 23,
}

export type Leak = {
    id: string
    type: 'checklist' | 'session' | 'rupture' | 'reported_loss'
    severity: 'critical' | 'warning' | 'info'
    label: string
    penalty: number
}

function getStartOfOperationalWeek(): string {
    const now = new Date()
    const day = now.getUTCDay()
    const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1)
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff, 3, 0, 0, 0))
    if (now < start) start.setUTCDate(start.getUTCDate() - 7)
    return start.toISOString()
}

/**
 * Calcula a Saúde da Operação (V2.2 - Weekly Refined)
 * Separa vazamentos ativos (checklist/sessão) de perdas acumuladas.
 */
export async function getOperationalHealthAction() {
    try {
        const now = new Date()
        const startOfToday = new Date()
        startOfToday.setHours(0, 0, 0, 0)
        const startOfWeek = getStartOfOperationalWeek()
        
        const activeLeaks: Leak[] = []
        const weeklyLeaks: Leak[] = []
        let currentScore = 100

        // 1. VAZAMENTOS ATIVOS: CHECKLISTS PENDENTES (Hoje)
        const { data: templates } = await supabase
            .from('checklist_templates')
            .select('id, name, context')
            .eq('active', true)
            .in('context', ['opening', 'closing'])

        if (templates) {
            const currentHour = now.getHours()
            for (const template of templates) {
                const isOpeningLate = template.context === 'opening' && currentHour >= LIMITS.OPENING_HOUR_CUTOFF
                const isClosingLate = template.context === 'closing' && currentHour >= LIMITS.CLOSING_HOUR_CUTOFF
                if (isOpeningLate || isClosingLate) {
                    const { data: session } = await supabase
                        .from('checklist_sessions')
                        .select('id')
                        .eq('template_id', template.id)
                        .eq('status', 'completed')
                        .gte('completed_at', startOfToday.toISOString())
                        .maybeSingle()
                    if (!session) {
                        activeLeaks.push({
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

        // 2. VAZAMENTOS ATIVOS: SESSÕES TRAVADAS (Hoje)
        const fourHoursAgo = new Date(now.getTime() - LIMITS.STUCK_SESSION_HOURS * 60 * 60 * 1000).toISOString()
        const { data: stuckSessions } = await supabase
            .from('count_sessions')
            .select('id, groups(name)')
            .eq('status', 'in_progress')
            .lt('started_at', fourHoursAgo)
            .gte('started_at', startOfToday.toISOString())
        if (stuckSessions) {
            stuckSessions.forEach(s => {
                activeLeaks.push({
                    id: `session-${s.id}`,
                    type: 'session',
                    severity: 'warning',
                    label: `Trancado: ${(s.groups as any)?.name || 'Setor'}`,
                    penalty: PENALTIES.STUCK_SESSION
                })
                currentScore -= PENALTIES.STUCK_SESSION
            })
        }

        // 3. PERDAS DA SEMANA: REPORTADAS
        const { data: reportedLosses } = await supabase
            .from('inventory_losses')
            .select('id, item_id, items(name)')
            .gte('created_at', startOfWeek)
        const reportedItemIds = new Set<string>()
        if (reportedLosses) {
            reportedLosses.forEach(rl => {
                reportedItemIds.add(rl.item_id)
                weeklyLeaks.push({
                    id: `loss-${rl.id}`,
                    type: 'reported_loss',
                    severity: 'info',
                    label: `Perda: ${(rl.items as any)?.name}`,
                    penalty: PENALTIES.REPORTED_LOSS
                })
                currentScore -= PENALTIES.REPORTED_LOSS
            })
        }

        // 4. PERDAS DA SEMANA: RUPTURAS
        const { data: zeroedItems } = await supabase
            .from('count_session_items')
            .select('item_id, items(name)')
            .eq('is_zeroed', true)
            .gte('created_at', startOfWeek)
        if (zeroedItems) {
            zeroedItems.filter(zi => !reportedItemIds.has(zi.item_id)).forEach(zi => {
                weeklyLeaks.push({
                    id: `rupture-${zi.item_id}`,
                    type: 'rupture',
                    severity: 'info',
                    label: `Ruptura: ${(zi.items as any)?.name}`,
                    penalty: PENALTIES.ITEM_ZEROED
                })
                currentScore -= PENALTIES.ITEM_ZEROED
            })
        }

        // Home Top 3: Prioriza Ativos, depois Semanais
        const combinedLeaksForHome = [...activeLeaks, ...weeklyLeaks].slice(0, 3)

        return {
            success: true,
            score: Math.max(0, Math.min(100, currentScore)),
            penalidade_total: 100 - currentScore,
            activeLeaks,
            weeklyLeaks,
            combinedLeaks: combinedLeaksForHome
        }
    } catch (err: any) {
        console.error('[Efficiency] Erro no motor de saúde:', err.message)
        return { success: false, error: err.message, score: 100, activeLeaks: [], weeklyLeaks: [], combinedLeaks: [] }
    }
}

export async function getGlobalHouseHealthAction() {
    try {
        const startOfWeek = getStartOfOperationalWeek()
        const { data: losses, error } = await supabase
            .from('inventory_losses')
            .select('*, items(name, unit), users(name)')
            .gte('created_at', startOfWeek)
            .order('created_at', { ascending: false })
        if (error) throw error
        const healthRes = await getOperationalHealthAction()
        return { success: true, losses: losses || [], activeLeaks: healthRes.activeLeaks, weeklyLeaks: healthRes.weeklyLeaks }
    } catch (err: any) {
        return { success: false, error: err.message, losses: [], activeLeaks: [], weeklyLeaks: [] }
    }
}
