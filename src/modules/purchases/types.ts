// ── Módulo de Compras e Abastecimento — Tipos TypeScript ──────────────────────

export type OrderStatus =
    | 'rascunho'
    | 'enviado'
    | 'em_analise'
    | 'em_separacao'
    | 'separado'
    | 'em_entrega'
    | 'entregue'
    | 'recebido'
    | 'divergente'
    | 'cancelado'

export type ItemOrigin = 'cozinha_central' | 'fornecedor_externo'

export interface PurchaseItem {
    id: string
    name: string
    category: string
    order_unit: string
    count_unit: string
    allows_decimal: boolean
    min_stock: number | null
    max_stock: number | null
    origin: ItemOrigin
    is_active: boolean
    /**
     * Sinaliza itens importados com dados incompletos ou inconsistentes
     * (sem mín/máx, ou mín > máx). Admin deve revisar antes de usar.
     */
    pending_review: boolean
    default_unit_price?: number | null
    created_at: string
    updated_at: string
}

export interface StoreItemParameter {
    id: string
    store_id: string
    item_id: string
    min_stock: number | null
    max_stock: number | null
    is_active: boolean
    purchase_items?: PurchaseItem
}

export interface PurchaseOrder {
    id: string
    store_id: string
    created_by: string
    status: OrderStatus
    notes: string | null
    kitchen_notes?: string | null
    created_at: string
    updated_at: string
    sent_at: string | null
    received_at: string | null
    // joined
    store_name?: string
    creator_name?: string
    items?: PurchaseOrderItem[]
    item_count?: number
}

export interface PurchaseOrderItem {
    id: string
    order_id: string
    item_id: string
    requested_qty: number
    separated_qty: number | null
    received_qty: number | null
    /** @deprecated use separation_notes or received_notes for new flows */
    notes: string | null
    separation_notes?: string | null
    received_notes?: string | null
    unit_price?: number | null
    price_source?: string | null
    price_updated_by?: string | null
    price_updated_at?: string | null
    created_at: string
    updated_at: string
    // joined
    item?: PurchaseItem
}

export interface PurchaseOrderEvent {
    id: string
    order_id: string
    user_id: string | null
    event_type: PurchaseEventType
    payload: Record<string, unknown> | null
    created_at: string
    // joined
    user_name?: string
}

export type PurchaseEventType =
    | 'order_created'
    | 'order_submitted'
    | 'status_changed'
    | 'item_added'
    | 'item_removed'
    | 'item_qty_updated'
    | 'item_price_updated'
    | 'separation_updated'
    | 'order_separated'
    | 'receiving_started'
    | 'received_qty_updated'
    | 'order_received'
    | 'divergence_registered'
    | 'note_added'
    | 'kitchen_notes_updated'
    | 'order_cancelled'
    | 'production_suggested'
    | 'production_approved'
    | 'production_completed'

// ── Produção e Planejamento ──────────────────────────────────────────────────

export interface Recipe {
    id: string
    product_id: string
    ingredient_id: string
    quantity: number
    unit: string
    yield_percentage: number
    product?: PurchaseItem
    ingredient?: PurchaseItem
}

export interface InventoryBalance {
    id: string
    item_id: string
    location_id: string
    quantity: number
    reserved_qty: number
    type: 'raw' | 'semi_finished' | 'finished'
    updated_at: string
    item?: PurchaseItem
}

export interface ProductionSuggestion {
    id: string
    purchase_order_id: string | null
    planning_batch_id: string | null
    item_id: string
    source_location_id: string | null
    destination_location_id: string | null
    requested_qty: number
    ready_stock_qty: number
    scheduled_qty: number
    suggested_qty: number
    approved_qty: number | null
    adjustment_reason: AdjustmentReason | null
    adjustment_notes: string | null
    adjusted_by: string | null
    status: 'pending' | 'approved' | 'dismissed'
    calculated_at: string
    created_at: string
    updated_at: string
    item?: PurchaseItem
}

export type AdjustmentReason =
    | 'estoque físico diferente'
    | 'produção estratégica'
    | 'validade próxima'
    | 'pedido ajustado'
    | 'falta de insumo'
    | 'decisão do gestor'
    | 'outro'

export interface ProductionOrder {
    id: string
    status: 'pending' | 'in_progress' | 'completed' | 'canceled'
    location_id: string
    notes: string | null
    created_by: string
    approved_at: string | null
    completed_at: string | null
    created_at: string
    updated_at: string
    items?: ProductionOrderItem[]
}

export interface ProductionOrderItem {
    id: string
    production_order_id: string
    item_id: string
    source_suggestion_id: string | null
    planned_qty: number
    approved_qty: number
    produced_qty: number
    lost_qty: number
    unit: string | null
    status: 'pending' | 'produced' | 'rejected'
    item?: PurchaseItem
}

export interface OperationalTask {
    id: string
    type: 'production' | 'delivery' | 'maintenance' | 'other'
    title: string
    description: string | null
    area: string | null
    responsible_id: string | null
    deadline: string | null
    status: 'pending' | 'in_progress' | 'completed' | 'canceled'
    conclusion_criteria: string | null
    evidence_url: string | null
    production_order_id: string | null
    created_at: string
    updated_at: string
}

// ── Configurações de exibição dos status ──────────────────────────────────────

export interface StatusConfig {
    label: string
    color: string          // bg color class (Tailwind)
    textColor: string      // text color class
    borderColor: string    // border color class
    dotColor: string       // dot/indicator color
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
    rascunho: {
        label: 'Rascunho',
        color: 'bg-gray-100',
        textColor: 'text-gray-600',
        borderColor: 'border-gray-200',
        dotColor: 'bg-gray-400',
    },
    enviado: {
        label: 'Enviado',
        color: 'bg-blue-50',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-100',
        dotColor: 'bg-blue-500',
    },
    em_analise: {
        label: 'Em Análise',
        color: 'bg-indigo-50',
        textColor: 'text-indigo-700',
        borderColor: 'border-indigo-100',
        dotColor: 'bg-indigo-500',
    },
    em_separacao: {
        label: 'Em Separação',
        color: 'bg-amber-50',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-100',
        dotColor: 'bg-amber-500',
    },
    separado: {
        label: 'Separado',
        color: 'bg-orange-50',
        textColor: 'text-orange-700',
        borderColor: 'border-orange-100',
        dotColor: 'bg-orange-500',
    },
    em_entrega: {
        label: 'Em Entrega',
        color: 'bg-violet-50',
        textColor: 'text-violet-700',
        borderColor: 'border-violet-100',
        dotColor: 'bg-violet-500',
    },
    entregue: {
        label: 'Entregue',
        color: 'bg-teal-50',
        textColor: 'text-teal-700',
        borderColor: 'border-teal-100',
        dotColor: 'bg-teal-500',
    },
    recebido: {
        label: 'Recebido',
        color: 'bg-emerald-50',
        textColor: 'text-emerald-700',
        borderColor: 'border-emerald-100',
        dotColor: 'bg-emerald-500',
    },
    divergente: {
        label: 'Divergente',
        color: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-100',
        dotColor: 'bg-red-500',
    },
    cancelado: {
        label: 'Cancelado',
        color: 'bg-rose-50',
        textColor: 'text-rose-800',
        borderColor: 'border-rose-100',
        dotColor: 'bg-rose-700',
    },
}

// Status que permitem edição pelo gerente (apenas rascunho)
export const EDITABLE_STATUSES: OrderStatus[] = ['rascunho']

// Status que a cozinha pode atuar sobre
export const KITCHEN_ACTIONABLE_STATUSES: OrderStatus[] = [
    'enviado', 'em_analise', 'em_separacao', 'separado', 'divergente'
]

// Status finais (não há mais ação possível)
export const TERMINAL_STATUSES: OrderStatus[] = ['recebido', 'divergente', 'cancelado']

// Categorias de itens padrão
export const ITEM_CATEGORIES = [
    'Proteínas',
    'Hortifrutigranjeiros',
    'Laticínios',
    'Grãos e Secos',
    'Molhos e Condimentos',
    'Descartáveis',
    'Limpeza',
    'Bebidas',
    'Funcionário',
    'Outros',
] as const

export type ItemCategory = typeof ITEM_CATEGORIES[number]

/**
 * Regras de unidade padrão por categoria (aplicadas na importação).
 * Regra geral: 'un'. Exceção: 'Funcionário' → 'kg' (permite decimal).
 */
export function getDefaultUnit(category: string): { order_unit: string; allows_decimal: boolean } {
    if (category === 'Funcionário') return { order_unit: 'kg', allows_decimal: true }
    return { order_unit: 'un', allows_decimal: false }
}

/**
 * Valida se um item importado precisa de revisão pelo admin.
 */
export function needsReview(min: number | null, max: number | null): boolean {
    if (min === null && max === null) return true  // sem parâmetros
    if (min !== null && max !== null && min > max) return true  // inconsistência
    return false
}
