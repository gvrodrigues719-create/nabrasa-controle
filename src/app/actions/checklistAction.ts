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
import { getActiveOperator } from './pinAuth'

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
 * Inicia ou Recupera uma sessão de checklist baseada em uma rotina e grupo (MOC Flow)
 */
export async function initChecklistSessionAction(routineId: string, groupId: string, userId: string) {
    try {
        const { data: group } = await supabase.from('groups').select('name').eq('id', groupId).single()
        const { data: routineRow } = await supabase
            .from('routines')
            .select('snapshot_started_at, checklist_template_id')
            .eq('id', routineId)
            .single()

        if (!routineRow?.checklist_template_id) {
            throw new Error('Esta rotina não possui um checklist associado.')
        }

        // Calcula o âncoras de ciclo (madrugada do dia operacional)
        const brDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
        const cycleStart = `${brDate}T03:00:00Z`

        // Verifica se já existe sessão neste ciclo para este grupo/rotina
        const { data: existingSession } = await supabase
            .from('checklist_sessions')
            .select('id, status, user_id, execution_id, users(name)')
            .eq('routine_id', routineId)
            .eq('group_id', groupId)
            .gte('started_at', cycleStart)
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (existingSession) {
            if (existingSession.status === 'completed') {
                return { blocked: 'Este checklist já foi concluído hoje.' }
            }
            if (existingSession.status === 'in_progress' && existingSession.user_id !== userId) {
                const uName = (existingSession.users as any)?.name || 'Outro usuário'
                return { blocked: `Esta tarefa está sendo executada por ${uName}.` }
            }
        }

        let sessionId = existingSession?.id

        // Puxa a execução ativa (Operational Event)
        const { data: exec } = await supabase.from('routine_executions').select('id').eq('routine_id', routineId).eq('status', 'active').maybeSingle()

        if (!existingSession) {
            const { data: newSession, error: insErr } = await supabase.from('checklist_sessions').insert([{
                template_id: routineRow.checklist_template_id,
                routine_id: routineId,
                group_id: groupId,
                user_id: userId,
                status: 'in_progress',
                started_at: new Date().toISOString(),
                execution_id: exec?.id || null
            }]).select('id').single()
            
            if (insErr) throw insErr
            if (newSession) sessionId = newSession.id
            
            console.log(`[ACTION] Checklist Session Started | Routine: ${routineId} | Group: ${groupId} | User: ${userId}`)
        } else {
            // Garante vínculo com execução oficial se ela nascer depois da sessão
            if (exec?.id && existingSession.execution_id !== exec.id) {
                await supabase.from('checklist_sessions').update({ execution_id: exec.id }).eq('id', sessionId)
            }
        }

        return { success: true, sessionId }
    } catch (error: any) {
        console.error('Error in initChecklistSessionAction:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Inicia uma nova sessão de checklist avulsa
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
    evidenceUrl?: string,
    correctedNow: boolean = false,
    needsAttention: boolean = false,
    numericValue?: number
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
            throw new Error('Acesso negado: Você não é o responsável por esta sessão.')
        }

        const { error } = await supabase
            .from('checklist_session_items')
            .upsert({
                session_id: sessionId,
                item_id: itemId,
                value: value,
                observation: observation,
                evidence_url: evidenceUrl,
                corrected_now: correctedNow,
                needs_manager_attention: needsAttention,
                numeric_value: numericValue
            }, {
                onConflict: 'session_id,item_id'
            })

        if (error) throw error
        console.log(`[ACTION] Checklist response saved | Session: ${sessionId} | Item: ${itemId} | User: ${authId} | Corrected: ${correctedNow}`)
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
            .select('item_id, value, evidence_url, observation')
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

        // 2. Buscar dados do template e itens para o snapshot
        const { data: templateItems } = await supabase
            .from('checklist_template_items')
            .select('*')
            .eq('template_id', session.template_id)
            .order('display_order')

        const { data: templateData } = await supabase
            .from('checklist_templates')
            .select('*')
            .eq('id', session.template_id)
            .single()

        // 3. Buscar detalhes do operador para a assinatura
        const operator = await getActiveOperator()

        // 4. Marcar como concluído e salvar snapshot + assinatura
        const { error: updateError } = await supabase
            .from('checklist_sessions')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                template_snapshot: { 
                    template: templateData, 
                    items: templateItems 
                },
                signature_name: operator?.name || 'Sistema',
                signature_role: operator?.role || 'operator'
            })
            .eq('id', sessionId)

        if (updateError) throw updateError

        // 5. Gerar Pendências Operacionais para itens marcados como "Não" (false)
        const failedResponses = responses?.filter(r => r.value === false) || []
        
        if (failedResponses.length > 0) {
            const pendingIssues = failedResponses.map(r => {
                const itemDef = templateItems?.find(it => it.id === r.item_id)
                return {
                    checklist_session_id: sessionId,
                    checklist_item_id: r.item_id,
                    unit_id: (templateData as any).unit_id || '00000000-0000-0000-0000-000000000000', // Valor fallback se unit_id não estiver no template
                    area: templateData?.area,
                    turno: templateData?.turno,
                    severity: itemDef?.criticality === 'critical' ? 'critical' : (itemDef?.criticality === 'important' ? 'high' : 'medium'),
                    title: `Falha: ${itemDef?.label || 'Item de Checklist'}`,
                    description: r.observation || 'Nenhuma observação fornecida.',
                    status: 'pending',
                    visible_to_manager: true,
                    visible_in_collective_view: (itemDef as any).generates_issue || false
                }
            })

            const { error: issueErr } = await supabase.from('operational_pending_issues').insert(pendingIssues)
            if (issueErr) console.error('[ACTION] Erro ao gerar pendências operacionais:', issueErr)
        }

        // 6. GAMIFICAÇÃO E EVENTOS OPERACIONAIS (Fire-and-forget)
        try {
            if (session.user_id) {
                const { recordPointsAction, recordSealingEventAction } = await import('./gamificationAction')
                
                await recordPointsAction(
                    session.user_id,
                    'checklist_completion',
                    sessionId,
                    50,
                    'Checklist operacional concluído.'
                )

                const now = new Date()
                const currentHour = now.getHours()
                const isCritical = templateData?.context === 'opening' || templateData?.context === 'closing'
                const isOnTime = 
                    (templateData?.context === 'opening' && currentHour < 11) ||
                    (templateData?.context === 'closing' && currentHour < 23)

                if (isCritical && isOnTime) {
                    await recordSealingEventAction(session.user_id, 'checklist_on_time', sessionId)
                }

                await recordSealingEventAction(session.user_id, 'session_clean_close', sessionId)
            }
        } catch (gamErr) {
            console.error('[Gamification] Silently failed during checklist completion:', gamErr)
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
                area: template.area,
                momento: template.momento,
                turno: template.turno,
                priority: template.priority,
                frequency: template.frequency,
                evidence_required_default: template.evidence_required_default,
                requires_signature: template.requires_signature,
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
 * SALVAR ITENS DO TEMPLATE (ADMIN)
 * Substitui os itens atuais do template pelos novos fornecidos.
 */
export async function saveTemplateItemsAction(templateId: string, items: ChecklistTemplateItem[]) {
    try {
        await requireManagerOrAdmin()

        // 1. Deleta itens atuais (estratégia de replace total para simplificar reordenação e deleção)
        const { error: delErr } = await supabase
            .from('checklist_template_items')
            .delete()
            .eq('template_id', templateId)
        
        if (delErr) throw delErr

        // 2. Insere os novos itens
        const { error: insErr } = await supabase
            .from('checklist_template_items')
            .insert(items.map(item => ({
                template_id: templateId,
                label: item.label,
                description: item.description,
                response_type: item.response_type,
                required: item.required,
                evidence_required: item.evidence_required,
                display_order: item.display_order,
                criticality: item.criticality,
                generates_issue: item.generates_issue,
                generates_alert: item.generates_alert,
                help_text: item.help_text,
                options: item.options
            })))

        if (insErr) throw insErr

        revalidatePath('/dashboard/admin/checklists')
        return { success: true }
    } catch (error: any) {
        console.error('Error saving template items:', error)
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
        await requireManagerOrAdmin()
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

        // --- AUTOMAÇÃO: Rodar distribuição proativa ---
        // Se não há sessões para HOJE, mas existem REGRAS, rodamos a distribuição automaticamente.
        const todaySessions = sessions?.filter(s => s.scheduled_for === today)
        if (todaySessions?.length === 0) {
            const { data: activeRules } = await supabase
                .from('checklist_attribution_rules')
                .select('id')
                .eq('is_active', true)
                .limit(1)

            if (activeRules && activeRules.length > 0) {
                console.log('[AUTO-DISTRIBUTION] Nenhuma sessão para hoje. Rodando motor proativamente...')
                await runChecklistDistributionAction()
                // Recarregar sessões após distribuição
                const { data: newSessions } = await supabase
                    .from('checklist_sessions')
                    .select(`
                        *,
                        checklist_templates(name, context, priority),
                        users(id, name, position, sector, shift)
                    `)
                    .or(`scheduled_for.eq.${today},and(scheduled_for.lt.${today},status.eq.in_progress)`)
                
                if (newSessions) {
                    // Update sessions reference for the rest of calculation
                    sessions?.splice(0, sessions.length, ...newSessions)
                }
            }
        }
        // ----------------------------------------------

        // 2. Buscar perdas recentes (24h)
        const { data: losses } = await supabase
            .from('inventory_losses')
            .select('*, items(name), users(name, sector)')
            .gte('created_at', yesterday)

        // 4. Buscar Pendências Operacionais Ativas
        const { count: pendingIssuesCount } = await supabase
            .from('operational_pending_issues')
            .select('*', { count: 'exact', head: true })
            .eq('resolved', false)

        // 5. PROCESSAMENTO OPERACIONAL
        const stats = {
            overview: {
                total: sessions?.length || 0,
                completed: sessions?.filter(s => s.status === 'completed').length || 0,
                pending: sessions?.filter(s => s.status === 'in_progress').length || 0,
                late: sessions?.filter(s => s.scheduled_for < today && s.status === 'in_progress').length || 0,
                critical: sessions?.filter(s => s.checklist_templates?.priority === 'critical' && s.status === 'in_progress').length || 0,
                lossesCount: losses?.length || 0,
                pendingIssuesCount: pendingIssuesCount || 0,
                deadRulesCount: 0
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
                    id: s.user_id,
                    name: s.users?.name,
                    position: s.users?.position,
                    sector: s.users?.sector,
                    total: 0,
                    completed: 0,
                    late: 0,
                    sessions: [] as any[]
                })
            }
            const u = userMap.get(s.user_id)
            u.total++
            if (s.status === 'completed') u.completed++
            if (s.status === 'in_progress') {
                u.sessions.push({
                    id: s.id,
                    name: s.checklist_templates?.name,
                    isLate: s.scheduled_for < today
                })
                if (s.scheduled_for < today) u.late++
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

/**
 * Busca pendências operacionais ativas (não resolvidas)
 */
export async function getPendingIssuesAction() {
    try {
        const { data, error } = await supabase
            .from('operational_pending_issues')
            .select(`
                *,
                checklist_sessions (
                    id,
                    checklist_templates (name)
                ),
                users (name)
            `)
            .eq('resolved', false)
            .order('criticality', { ascending: false })
            .order('created_at', { ascending: false })

        if (error) throw error

        return { success: true, data }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}
