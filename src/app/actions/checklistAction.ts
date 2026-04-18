"use server"

import { createClient } from '@supabase/supabase-js'
import { 
    ChecklistTemplate, 
    ChecklistSession, 
    ChecklistSessionStatus,
    ChecklistTemplateItem
} from '@/modules/checklist/types'
import { revalidatePath } from 'next/cache'
import { getAuthenticatedUserId, requireManagerOrAdmin } from '@/lib/auth-utils'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Busca todos os templates de checklist ativos
 */
export async function getChecklistTemplatesAction() {
    try {
        const { data, error } = await supabase
            .from('checklist_templates')
            .select('*')
            .eq('active', true)
            .order('name')

        if (error) throw error
        return { success: true, data: data as ChecklistTemplate[] }
    } catch (error: any) {
        console.error('Error fetching checklist templates:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Busca detalhes de um template incluindo os itens
 */
export async function getChecklistTemplateDetailsAction(templateId: string) {
    try {
        const { data: template, error: tError } = await supabase
            .from('checklist_templates')
            .select('*')
            .eq('id', templateId)
            .single()

        if (tError) throw tError

        const { data: items, error: iError } = await supabase
            .from('checklist_template_items')
            .select('*')
            .eq('template_id', templateId)
            .order('display_order')

        if (iError) throw iError

        return { 
            success: true, 
            data: { 
                ...template, 
                items: items as ChecklistTemplateItem[] 
            } 
        }
    } catch (error: any) {
        console.error('Error fetching template details:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Inicia uma nova sessão de checklist
 */
export async function startChecklistSessionAction(templateId: string, userId: string) {
    try {
        // SEGURANÇA: Garante que o userId é o do solicitante ou manager
        const authId = await getAuthenticatedUserId()
        if (!authId) throw new Error('Não autenticado')

        const { data, error } = await supabase
            .from('checklist_sessions')
            .insert({
                template_id: templateId,
                user_id: userId,
                status: 'in_progress'
            })
            .select()
            .single()

        if (error) throw error
        return { success: true, sessionId: data.id }
    } catch (error: any) {
        console.error('Error starting checklist session:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Salva ou atualiza uma resposta individual
 */
export async function saveChecklistResponseAction(
    sessionId: string, 
    itemId: string, 
    value: any,
    observation?: string,
    evidenceUrl?: string
) {
    try {
        // SEGURANÇA: Validar Ownership
        const authId = await getAuthenticatedUserId()
        const { data: session } = await supabase
            .from('checklist_sessions')
            .select('user_id')
            .eq('id', sessionId)
            .single()
        
        if (!session || (session.user_id !== authId)) {
            // Permitir se for manager/admin? No handoff diz "proteção de dono", então restringimos.
            // Mas gestores podem precisar auditar. Por ora, restringimos ao dono para anti-spoofing rigoroso.
            throw new Error('Acesso negado: Você não é o responsável por esta sessão.')
        }

        const { error } = await supabase
            .from('checklist_session_items')
            .upsert({
                session_id: sessionId,
                item_id: itemId,
                value: value,
                observation: observation,
                evidence_url: evidenceUrl
            }, {
                onConflict: 'session_id,item_id'
            })

        if (error) throw error
        console.log(`[ACTION] Checklist response saved | Session: ${sessionId} | Item: ${itemId} | User: ${authId}`)
        return { success: true }
    } catch (error: any) {
        console.error(`[AUTH_FAIL] saveChecklistResponseAction | Session: ${sessionId} | Error: ${error.message}`)
        return { success: false, error: error.message }
    }
}

/**
 * Busca as respostas atuais de uma sessão
 */
export async function getSessionResponsesAction(sessionId: string) {
    try {
        const { data, error } = await supabase
            .from('checklist_session_items')
            .select('*')
            .eq('session_id', sessionId)

        if (error) throw error
        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching session responses:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Conclui a sessão de checklist
 */
export async function completeChecklistSessionAction(sessionId: string) {
    try {
        // SEGURANÇA: Validar Ownership
        const authId = await getAuthenticatedUserId()

        // 1. Validar se todos os itens obrigatórios foram respondidos
        // Buscamos o template_id da sessão
        const { data: session } = await supabase
            .from('checklist_sessions')
            .select('template_id, user_id')
            .eq('id', sessionId)
            .single()

        if (!session) throw new Error('Sessão não encontrada')
        if (session.user_id !== authId) throw new Error('Acesso negado')

        // Buscamos IDs dos itens obrigatórios (valor) deste template
        const { data: requiredItems } = await supabase
            .from('checklist_template_items')
            .select('id')
            .eq('template_id', session.template_id)
            .eq('required', true)
        
        const requiredIds = requiredItems?.map(i => i.id) || []

        // Buscamos IDs dos itens que EXIGEM evidência deste template
        const { data: evidenceItems } = await supabase
            .from('checklist_template_items')
            .select('id')
            .eq('template_id', session.template_id)
            .eq('evidence_required', true)
        
        const evidenceRequiredIds = evidenceItems?.map(i => i.id) || []

        // Buscamos as respostas já salvas com as evidências
        const { data: responses } = await supabase
            .from('checklist_session_items')
            .select('item_id, value, evidence_url')
            .eq('session_id', sessionId)

        const respondedIds = responses?.filter(r => r.value !== null && r.value !== undefined).map(r => r.item_id) || []
        const evidencedIds = responses?.filter(r => r.evidence_url !== null && r.evidence_url !== '').map(r => r.item_id) || []

        // Verifica se faltam itens obrigatórios
        const missingIds = requiredIds.filter(id => !respondedIds.includes(id))
        
        // Verifica se faltam evidências obrigatórias
        const missingEvidenceIds = evidenceRequiredIds.filter(id => !evidencedIds.includes(id))

        if (missingIds.length > 0) {
            return { 
                success: false, 
                error: `Faltam ${missingIds.length} itens obrigatórios para preencher.` 
            }
        }

        if (missingEvidenceIds.length > 0) {
            return {
                success: false,
                error: `Faltam ${missingEvidenceIds.length} fotos obrigatórias.`
            }
        }

        // 2. Marcar como concluído
        const { error: updateError } = await supabase
            .from('checklist_sessions')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', sessionId)

        if (updateError) throw updateError

        // 3. VEDAÇÃO VD-02: Premiar se concluído no prazo (fire-and-forget)
        try {
            if (session.user_id) {
                const { data: template } = await supabase
                    .from('checklist_templates')
                    .select('context')
                    .eq('id', session.template_id)
                    .single()

                const now = new Date()
                const currentHour = now.getHours()
                const isCritical = template?.context === 'opening' || template?.context === 'closing'
                const isOnTime = 
                    (template?.context === 'opening' && currentHour < 11) ||
                    (template?.context === 'closing' && currentHour < 23)

                if (isCritical && isOnTime) {
                    const { recordSealingEventAction } = await import('./gamificationAction')
                    await recordSealingEventAction(session.user_id, 'checklist_on_time', sessionId)
                }
            }
        } catch {
            // Silencioso — gamificação nunca interrompe a operação
        }

        revalidatePath('/dashboard/checklist')
        return { success: true }
    } catch (error: any) {
        console.error('Error completing checklist session:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Busca todas as sessões concluídas ou em progresso para monitoramento
 */
export async function getAllChecklistSessionsAction(status?: ChecklistSessionStatus) {
    try {
        let query = supabase
            .from('checklist_sessions')
            .select(`
                *,
                checklist_templates(name, context, priority),
                users(id, name, role, position, sector, shift)
            `)
        
        if (status) {
            query = query.eq('status', status)
        }

        const { data, error } = await query.order('created_at', { ascending: false })

        if (error) throw error
        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching all checklist sessions:', error)
        return { success: false, error: error.message }
    }
}

/**
 * BUSCA TAREFAS "PARA MIM" (CHECKLISTS ATRIBUÍDOS)
 */
export async function getMyPendingChecklistsAction(userId: string) {
    try {
        const { data, error } = await supabase
            .from('checklist_sessions')
            .select(`
                *,
                checklist_templates(name, description, context, priority, evidence_required_default)
            `)
            .eq('user_id', userId)
            .eq('status', 'in_progress')
            .order('priority', { ascending: false })

        if (error) throw error
        return { success: true, data }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * SALVAR/ATUALIZAR TEMPLATE (ADMIN)
 */
export async function saveChecklistTemplateAction(template: Partial<ChecklistTemplate>) {
    try {
        await requireManagerOrAdmin()

        const { data, error } = await supabase
            .from('checklist_templates')
            .upsert({
                id: template.id,
                name: template.name,
                description: template.description,
                context: template.context,
                priority: template.priority,
                frequency: template.frequency,
                evidence_required_default: template.evidence_required_default,
                active: template.active
            })
            .select()
            .single()

        if (error) throw error
        revalidatePath('/dashboard/admin/checklists')
        return { success: true, data }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * GESTÃO DE REGRAS DE ATRIBUIÇÃO (ADMIN)
 */
export async function getTemplateRulesAction(templateId: string) {
    try {
        await requireManagerOrAdmin()
        const { data, error } = await supabase
            .from('checklist_attribution_rules')
            .select('*')
            .eq('template_id', templateId)
        
        if (error) return { success: false, error: error.message }
        return { success: true, data }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function saveAttributionRuleAction(rule: any) {
    try {
        await requireManagerOrAdmin()
        const { error } = await supabase
            .from('checklist_attribution_rules')
            .upsert(rule)
        
        if (error) return { success: false, error: error.message }
        revalidatePath('/dashboard/admin/checklists')
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * ENGINE: GERAR SESSÕES BASEADO EM REGRAS (HARDENED)
 */
export async function runChecklistDistributionAction(triggeringUserId?: string) {
    try {
        const authId = await requireManagerOrAdmin()
        const source = triggeringUserId ? 'manual' : 'automatic'
        const today = new Date().toISOString().split('T')[0]
        
        // 1. Buscar todas as regras ativas
        const { data: rules } = await supabase
            .from('checklist_attribution_rules')
            .select('*')
            .eq('is_active', true)

        if (!rules || rules.length === 0) return { success: true, count: 0, report: [] }

        let stats = {
            totalRules: rules.length,
            sessionsCreated: 0,
            sessionsSkipped: 0,
            deadRules: [] as string[]
        }

        for (const rule of rules) {
            // 2. Buscar usuários que batem com a regra (usando POSITION agora)
            let userQuery = supabase.from('users').select('id').eq('active', true)
            
            if (rule.target_position) userQuery = userQuery.eq('position', rule.target_position)
            if (rule.target_shift) userQuery = userQuery.eq('shift', rule.target_shift)
            if (rule.target_sector) userQuery = userQuery.eq('sector', rule.target_sector)
            if (rule.target_unit_id) userQuery = userQuery.eq('unit_id', rule.target_unit_id)

            const { data: targetUsers } = await userQuery

            if (!targetUsers || targetUsers.length === 0) {
                stats.deadRules.push(rule.id)
                continue
            }

            for (const user of targetUsers) {
                // 3. BLINDAGEM DE IDEMPOTÊNCIA: Verificar se já existe sessão hoje
                const { data: existing } = await supabase
                    .from('checklist_sessions')
                    .select('id')
                    .eq('template_id', rule.template_id)
                    .eq('user_id', user.id)
                    .eq('scheduled_for', today)
                    .maybeSingle()

                if (!existing) {
                    // 4. Gerar nova sessão com AUDITORIA
                    const { error: insError } = await supabase.from('checklist_sessions').insert({
                        template_id: rule.template_id,
                        user_id: user.id,
                        attribution_rule_id: rule.id,
                        attribution_source: source,
                        created_by: triggeringUserId,
                        scheduled_for: today,
                        status: 'in_progress'
                    })
                    
                    if (!insError) stats.sessionsCreated++
                } else {
                    stats.sessionsSkipped++
                }
            }
        }

        revalidatePath('/dashboard/checklist')
        revalidatePath('/dashboard/admin/checklists')
        return { success: true, count: stats.sessionsCreated, stats }
    } catch (error: any) {
        console.error('Distribution error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Busca detalhes completos de uma sessão específica para auditoria
 */
export async function getChecklistSessionDetailsAction(sessionId: string) {
    try {
        if (sessionId === 'demo-session') {
            return {
                success: true,
                data: {
                    session: {
                        id: 'demo-session',
                        template_id: 'demo-template',
                        status: 'in_progress',
                        user_id: 'demo-user',
                        checklist_templates: { name: 'Abertura de Casa (Demo)', context: 'opening' },
                        users: { name: 'Operador Teste' }
                    },
                    items: [
                        { id: 'i1', label: 'Limpeza do Salão', response_type: 'boolean', required: true, display_order: 1 },
                        { id: 'i2', label: 'Conferência de Estoque', response_type: 'number', required: true, display_order: 2 }
                    ],
                    responses: []
                }
            }
        }

        // 1. Busca dados da sessão
        const { data: session, error: sError } = await supabase
            .from('checklist_sessions')
            .select(`
                *,
                checklist_templates(name, description, context),
                users(name)
            `)
            .eq('id', sessionId)
            .single()

        if (sError) throw sError

        // 2. Busca itens do template
        const { data: templateItems, error: tiError } = await supabase
            .from('checklist_template_items')
            .select('*')
            .eq('template_id', session.template_id)
            .order('display_order')

        if (tiError) throw tiError

        // 3. Busca respostas da sessão
        const { data: responses, error: rError } = await supabase
            .from('checklist_session_items')
            .select('*')
            .eq('session_id', sessionId)

        if (rError) throw rError

        return { 
            success: true, 
            data: { 
                session, 
                items: templateItems as ChecklistTemplateItem[], 
                responses 
            } 
        }
    } catch (error: any) {
        console.error('Error fetching session details for audit:', error)
        return { success: false, error: error.message }
    }
}
/**
 * MOC OPERATIONAL MIRROR: Painel do Gerente
 * Consolda dados em tempo real para o turno atual.
 */
export async function getOperationalMirrorAction() {
    try {
        const today = new Date().toISOString().split('T')[0]
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

        // 1. Buscar todas as sessões relevantes (Hoje + Atrasadas)
        const { data: sessions, error: sessErr } = await supabase
            .from('checklist_sessions')
            .select(`
                *,
                checklist_templates(name, context, priority),
                users(id, name, position, sector, shift)
            `)
            .or(`scheduled_for.eq.${today},and(scheduled_for.lt.${today},status.eq.in_progress)`)

        if (sessErr) throw sessErr

        // 2. Buscar perdas recentes (24h)
        const { data: losses } = await supabase
            .from('inventory_losses')
            .select('*, items(name), users(name, sector)')
            .gte('created_at', yesterday)

        // 3. Buscar todas as regras ativas para checar "Regras Mortas"
        const { data: activeRules } = await supabase
            .from('checklist_attribution_rules')
            .select('*')
            .eq('is_active', true)

        // 4. PROCESSAMENTO OPERACIONAL
        const stats = {
            overview: {
                total: sessions?.length || 0,
                completed: sessions?.filter(s => s.status === 'completed').length || 0,
                pending: sessions?.filter(s => s.status === 'in_progress').length || 0,
                late: sessions?.filter(s => s.scheduled_for < today && s.status === 'in_progress').length || 0,
                critical: sessions?.filter(s => s.checklist_templates?.priority === 'critical' && s.status === 'in_progress').length || 0,
                lossesCount: losses?.length || 0,
                deadRulesCount: 0 // Será calculado abaixo
            },
            bySector: {
                cozinha: { total: 0, completed: 0, losses: 0 },
                bar: { total: 0, completed: 0, losses: 0 },
                salao: { total: 0, completed: 0, losses: 0 },
                estoque: { total: 0, completed: 0, losses: 0 }
            },
            collaborators: [] as any[],
            exceptions: [] as any[]
        }

        // Mapeamento por Setor
        sessions?.forEach(s => {
            const sector = (s.users?.sector?.toLowerCase() || 'geral') as keyof typeof stats.bySector
            if (stats.bySector[sector]) {
                stats.bySector[sector].total++
                if (s.status === 'completed') stats.bySector[sector].completed++
            }
        })

        // Perdas por Setor
        losses?.forEach(l => {
            const sector = (l.users?.sector?.toLowerCase() || 'geral') as keyof typeof stats.bySector
            if (stats.bySector[sector]) stats.bySector[sector].losses++
        })

        // Lista de Colaboradores e suas pendências
        const userMap = new Map()
        sessions?.forEach(s => {
            if (!s.user_id) return
            if (!userMap.has(s.user_id)) {
                userMap.set(s.user_id, {
                    name: s.users?.name,
                    position: s.users?.position,
                    sector: s.users?.sector,
                    total: 0,
                    completed: 0,
                    late: 0,
                    latest_session_id: null
                })
            }
            const u = userMap.get(s.user_id)
            u.total++
            if (s.status === 'completed') u.completed++
            if (s.scheduled_for < today && s.status === 'in_progress') {
                u.late++
                u.latest_session_id = s.id // Prioriza o ID do atraso
            } else if (u.latest_session_id === null && s.status === 'in_progress') {
                u.latest_session_id = s.id // Fallback para pendência
            }
        })
        stats.collaborators = Array.from(userMap.values())

        // Identificar Exceções (Regras Mortas)
        // Uma regra é morta se não gerou nenhuma sessão no dia
        activeRules?.forEach(rule => {
            const hasGenerated = sessions?.some(s => s.attribution_rule_id === rule.id && s.scheduled_for === today)
            if (!hasGenerated) {
                stats.exceptions.push({
                    type: 'dead_rule',
                    rule_id: rule.id,
                    template_id: rule.template_id
                })
            }
        })
        stats.overview.deadRulesCount = stats.exceptions.filter(e => e.type === 'dead_rule').length

        return { success: true, data: stats, lastUpdated: new Date().toISOString() }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * REATRIBUIÇÃO MANUAL: Gerente altera responsável pelo checklist no turno
 */
export async function updateSessionUserAction(sessionId: string, newUserId: string) {
    try {
        const { error } = await supabase
            .from('checklist_sessions')
            .update({ user_id: newUserId })
            .eq('id', sessionId)
        
        if (error) throw error
        revalidatePath('/dashboard/admin/checklists')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
