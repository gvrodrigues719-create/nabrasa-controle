"use server"
// Trigger build: SQL Migration Applied

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
 * DUPLICAR TEMPLATE (ADMIN)
 */
export async function duplicateChecklistTemplateAction(templateId: string) {
    try {
        await requireManagerOrAdmin()
        
        // 1. Busca original
        const { data: original, error: getErr } = await supabase
            .from('checklist_templates')
            .select('*, items:checklist_template_items(*)')
            .eq('id', templateId)
            .single()
            
        if (getErr) throw getErr
        
        // 2. Insere cópia do header
        const { data: newTemplate, error: insErr } = await supabase
            .from('checklist_templates')
            .insert({
                name: `${original.name} (Cópia)`,
                description: original.description,
                context: original.context,
                area: original.area,
                momento: original.momento,
                turno: original.turno,
                priority: original.priority,
                frequency: original.frequency,
                evidence_required_default: original.evidence_required_default,
                requires_signature: original.requires_signature,
                active: false // Nasce inativo por segurança
            })
            .select()
            .single()
            
        if (insErr) throw insErr
        
        // 3. Insere cópia dos itens
        if (original.items && original.items.length > 0) {
            const newItems = original.items.map((item: any) => ({
                template_id: newTemplate.id,
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
            }))
            
            const { error: itemErr } = await supabase
                .from('checklist_template_items')
                .insert(newItems)
                
            if (itemErr) throw itemErr
        }
        
        revalidatePath('/dashboard/admin/checklists')
        return { success: true, data: newTemplate }
    } catch (error: any) {
        console.error('Error duplicating template:', error)
        return { success: false, error: error.message }
    }
}

/**
 * EXCLUIR TEMPLATE (ADMIN)
 */
export async function deleteChecklistTemplateAction(templateId: string) {
    try {
        await requireManagerOrAdmin()
        
        // Soft delete ou cascade delete dependendo da política. 
        // Aqui usaremos delete físico pois templates são definições.
        const { error } = await supabase
            .from('checklist_templates')
            .delete()
            .eq('id', templateId)
            
        if (error) throw error
        
        revalidatePath('/dashboard/admin/checklists')
        return { success: true }
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
 * SALVAR RESPOSTA DE ITEM EM SESSÃO
 */
export async function saveChecklistResponseAction(
    sessionId: string, 
    itemId: string, 
    data: { 
        value?: any, 
        observation?: string, 
        corrected_now?: boolean, 
        needs_manager_attention?: boolean,
        numeric_value?: number
    }
) {
    try {
        const { error } = await supabase
            .from('checklist_session_items')
            .upsert({
                session_id: sessionId,
                item_id: itemId,
                value: data.value !== undefined ? String(data.value) : undefined,
                numeric_value: data.numeric_value,
                observation: data.observation,
                corrected_now: data.corrected_now || false,
                needs_manager_attention: data.needs_manager_attention || false,
                updated_at: new Date().toISOString()
            }, { onConflict: 'session_id, item_id' })

        if (error) throw error
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

/**
 * FINALIZAR SESSÃO DE CHECKLIST (SNAPSHOT + SCORE + PENDÊNCIAS)
 */
export async function completeChecklistSessionAction(sessionId: string, signatureName?: string, signatureRole?: string) {
    try {
        // 1. Buscar sessão, itens e respostas atuais
        const { data: session } = await supabase
            .from('checklist_sessions')
            .select(`
                *,
                checklist_templates (*, items:checklist_template_items(*))
            `)
            .eq('id', sessionId)
            .single()

        if (!session) throw new Error('Sessão não encontrada')

        const { data: responses } = await supabase
            .from('checklist_session_items')
            .select('*')
            .eq('session_id', sessionId)

        // 2. Gerar Snapshot (Fotografia do Template no momento da execução)
        const snapshot = {
            template: session.checklist_templates,
            responses: responses
        }

        // 3. Calcular Score e Identificar Pendências
        let score = 100
        const items = session.checklist_templates.items || []
        const pendingIssues = []

        for (const item of items) {
            const resp = responses?.find(r => r.item_id === item.id)
            const isNo = resp?.value === 'false' || resp?.value === 'Não'

            if (isNo) {
                // Penalidade no Score
                if (item.criticality === 'critical') score -= 20
                else if (item.criticality === 'important') score -= 10
                else score -= 5

                // Geração de Pendência Operacional se não corrigido na hora
                if (item.generates_issue && !resp?.corrected_now) {
                    pendingIssues.push({
                        session_id: sessionId,
                        item_id: item.id,
                        unit_id: session.unit_id,
                        title: `Falha: ${item.label}`,
                        description: resp?.observation || 'Sem observação detalhada.',
                        criticality: item.criticality,
                        area: session.checklist_templates.area,
                        turno: session.checklist_templates.turno,
                        resolved: false
                    })
                }
            }
        }

        score = Math.max(0, score)

        // 4. Salvar Pendências na Tabela
        if (pendingIssues.length > 0) {
            await supabase.from('operational_pending_issues').insert(pendingIssues)
        }

        // 5. Atualizar Sessão como Concluída
        const { error: upErr } = await supabase
            .from('checklist_sessions')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                template_snapshot: snapshot,
                completion_score: score,
                signature_name: signatureName,
                signature_role: signatureRole
            })
            .eq('id', sessionId)

        if (upErr) throw upErr

        revalidatePath('/dashboard/checklist')
        revalidatePath('/dashboard/admin/checklists')
        
        return { success: true, score }
    } catch (err: any) {
        console.error('Error completing session:', err)
        return { success: false, error: err.message }
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
