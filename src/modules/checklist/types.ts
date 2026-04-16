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
    type: ChecklistItemType;
    required: boolean;
    evidence_required: boolean;
    options?: string[]; // Somente para o tipo 'choice'
    display_order: number;
}

/**
 * Modelo de um Checklist (Template)
 */
export interface ChecklistTemplate {
    id: string;
    name: string;
    description?: string;
    context: ChecklistContext;
    active: boolean;
    items: ChecklistTemplateItem[];
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
    routine_id?: string; // Vínculo opcional com a rotina principal do MOC
    user_id: string;
    group_id?: string;   // Vínculo opcional com área/setor/frente
    status: ChecklistSessionStatus;
    started_at: string;
    completed_at?: string;
    
    // Regra de fechamento: progresso de itens obrigatórios
    mandatory_total: number;
    mandatory_filled: number;
}

/**
 * Resposta individual de um item em uma sessão
 */
export interface ChecklistResponse {
    id: string;
    session_id: string;
    item_id: string;
    value: string | number | boolean | null;
    observation?: string;
    evidence_url?: string | null;
    is_na: boolean; // Not Applicable
    created_at: string;
}
