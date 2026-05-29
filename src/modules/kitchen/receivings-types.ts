// ─────────────────────────────────────────────────────────────────────────────
// Tipos do Módulo de Recebimentos da Cozinha Central
// ─────────────────────────────────────────────────────────────────────────────

export type ReceivingStatus = 'scheduled' | 'delivered' | 'partial' | 'refused' | 'canceled'
export type ReceivingItemStatus = 'pending' | 'received' | 'partial' | 'not_delivered' | 'refused'
export type DeliveryPeriod = 'manha' | 'tarde' | 'noite' | 'horario_especifico'
export type ReceivingPriority = 'normal' | 'alta'
export type ReceivingEventType =
    | 'created'
    | 'updated'
    | 'marked_delivered'
    | 'marked_partial'
    | 'marked_refused'
    | 'canceled'

export interface CKReceivingItem {
    id: string
    receiving_id: string
    purchase_item_id?: string | null
    receiving_catalog_item_id?: string | null
    catalog_item_id?: string | null
    supplier_id?: string | null
    item_name: string
    expected_qty?: number | null
    expected_unit_price?: number | null
    expected_total?: number | null
    received_qty?: number | null
    unit?: string | null
    item_name_snapshot?: string | null
    unit_snapshot?: string | null
    item_status: ReceivingItemStatus
    notes?: string | null
    created_at: string
    updated_at: string
}

export interface CKReceiving {
    id: string
    title: string
    supplier_name?: string | null
    supplier_id?: string | null
    delivery_date: string // YYYY-MM-DD
    delivery_period?: DeliveryPeriod | null
    delivery_time?: string | null
    status: ReceivingStatus
    priority?: ReceivingPriority | null
    notes?: string | null
    destination_location_id?: string | null
    created_by: string
    received_by?: string | null
    received_at?: string | null
    reception_notes?: string | null
    refusal_reason?: string | null
    canceled_by?: string | null
    canceled_at?: string | null
    created_at: string
    updated_at: string
    // joined
    items?: CKReceivingItem[]
    creator_name?: string
    receiver_name?: string
    // computed
    is_overdue?: boolean
}

export interface CKReceivingEvent {
    id: string
    receiving_id: string
    user_id: string
    event_type: ReceivingEventType
    payload?: Record<string, unknown> | null
    created_at: string
    user_name?: string
}

export const RECEIVING_STATUS_CONFIG: Record<ReceivingStatus, {
    label: string
    color: string
    textColor: string
    dot: string
}> = {
    scheduled: { label: 'Prevista', color: 'bg-blue-50', textColor: 'text-blue-700', dot: 'bg-blue-500' },
    delivered: { label: 'Recebida', color: 'bg-green-50', textColor: 'text-green-700', dot: 'bg-green-500' },
    partial: { label: 'Parcial', color: 'bg-yellow-50', textColor: 'text-yellow-700', dot: 'bg-yellow-500' },
    refused: { label: 'Recusada', color: 'bg-red-50', textColor: 'text-red-700', dot: 'bg-red-500' },
    canceled: { label: 'Cancelada', color: 'bg-gray-100', textColor: 'text-gray-500', dot: 'bg-gray-400' },
}

export const PERIOD_LABELS: Record<string, string> = {
    manha: 'Manhã',
    tarde: 'Tarde',
    noite: 'Noite',
    horario_especifico: 'Horário Específico',
}

export const REFUSAL_REASONS = [
    'Qualidade ruim',
    'Produto errado',
    'Quantidade errada',
    'Fora do horário',
    'Fornecedor não entregou',
    'Embalagem danificada',
    'Outro',
]
