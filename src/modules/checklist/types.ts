/**
 * Contextos operacionais em que um checklist pode ser executado
 */
export type ChecklistContext = 'opening' | 'closing' | 'daily' | 'receiving' | 'custom';

/**
 * Tipos de resposta suportados pela engine de checklist
 */
export type ChecklistItemType = 'boolean' | 'number' | 'text' | 'choice' | 'temperature';

/**
 * Definição de um item (pergunta/tarefa) dentro de um template
 */
export interface ChecklistTemplateItem {
    id: string;
    section_name?: string;
    label: string;
    description?: string;
    response_type: ChecklistItemType;
    required: boolean;
    evidence_required: boolean;
    options?: string[];
    display_order: number;
    criticality: 'critical' | 'important' | 'standard';
    generates_issue: boolean;
    generates_alert: boolean;
    help_text?: string;
}

/**
 * Prioridade operacional de um checklist
 */
export type ChecklistPriority = 'low' | 'medium' | 'high';

/**
 * Frequência de atribuição
 */
export type ChecklistFrequency = 'daily' | 'weekly' | 'manual';

/**
 * Modelo de um Checklist (Template)
 */
export interface ChecklistTemplate {
    id: string;
    name: string;
    description?: string;
    context: ChecklistContext;
    priority: ChecklistPriority;
    frequency: ChecklistFrequency;
    active: boolean;
    evidence_required_default: boolean;
    unit_id?: string;
    area?: string;
    momento?: string;
    turno?: string;
    requires_signature: boolean;
    items?: ChecklistTemplateItem[];
}

export interface ChecklistAttributionRule {
    id: string;
    template_id: string;
    target_position?: string;
    target_shift?: string;
    target_sector?: string;
    target_unit_id?: string;
    weekdays?: number[]; // [0-6]
    is_active: boolean;
    created_at: string;
}

/**
 * Estado de uma sessão de execução de checklist
 */
export type ChecklistSessionStatus = 'in_progress' | 'completed' | 'canceled';

/**
 * Execução de um checklist por um usuário
 */
export interface ChecklistSession {
    id: string;
    template_id: string;
    routine_id?: string; 
    user_id: string;
    group_id?: string;   
    attribution_rule_id?: string;
    attribution_source: 'manual' | 'automatic';
    created_by?: string;
    status: ChecklistSessionStatus;
    scheduled_for?: string; 
    started_at: string;
    completed_at?: string;
    
    // Novas propriedades de preservação e assinatura
    signature_name?: string;
    signature_role?: string;
    template_snapshot?: any; // Snapshot dos itens no momento da execução

    // Metadados de progresso
    mandatory_total: number;
    mandatory_filled: number;

    // Relacionais
    checklist_templates?: Partial<ChecklistTemplate>;
    users?: { name: string; position?: string; shift?: string };
}

/**
 * Resposta individual de um item em uma sessão
 */
export interface ChecklistResponse {
    id: string;
    session_id: string;
    item_id: string;
    value: string | number | boolean | null;
    numeric_value?: number | null;
    observation?: string;
    evidence_url?: string | null;
    corrected_now: boolean;
    needs_manager_attention: boolean;
    is_na: boolean;
    created_at: string;
}
