"use server"

import { createClient } from '@supabase/supabase-js'
import { 
    ChecklistTemplate, 
    ChecklistSession, 
    ChecklistSessionStatus,
    ChecklistTemplateItem
} from '@/modules/checklist/types'
import { revalidatePath } from 'next/cache'

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
    observation?: string
) {
    try {
        const { error } = await supabase
            .from('checklist_session_items')
            .upsert({
                session_id: sessionId,
                item_id: itemId,
                value: value,
                observation: observation
            }, {
                onConflict: 'session_id,item_id'
            })

        if (error) throw error
        return { success: true }
    } catch (error: any) {
        console.error('Error saving checklist response:', error)
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
        // 1. Validar se todos os itens obrigatórios foram respondidos
        // Buscamos o template_id da sessão
        const { data: session } = await supabase
            .from('checklist_sessions')
            .select('template_id')
            .eq('id', sessionId)
            .single()

        if (!session) throw new Error('Sessão não encontrada')

        // Buscamos IDs dos itens obrigatórios deste template
        const { data: requiredItems } = await supabase
            .from('checklist_template_items')
            .select('id')
            .eq('template_id', session.template_id)
            .eq('required', true)

        const requiredIds = requiredItems?.map(i => i.id) || []

        // Buscamos as respostas já salvas
        const { data: responses } = await supabase
            .from('checklist_session_items')
            .select('item_id, value')
            .eq('session_id', sessionId)

        const respondedIds = responses?.filter(r => r.value !== null && r.value !== undefined).map(r => r.item_id) || []

        // Verifica se faltam itens obrigatórios
        const missingIds = requiredIds.filter(id => !respondedIds.includes(id))

        if (missingIds.length > 0) {
            return { 
                success: false, 
                error: `Faltam ${missingIds.length} itens obrigatórios para preencher.` 
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

        revalidatePath('/dashboard/checklist')
        return { success: true }
    } catch (error: any) {
        console.error('Error completing checklist session:', error)
        return { success: false, error: error.message }
    }
}
