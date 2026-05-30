export interface CountItem {
    id: string
    name: string
    unit: string
    unit_observation: string | null
    min_expected: number | null
    max_expected: number | null
    image_url: string | null
}

export type CountSessionStatus = 'in_progress' | 'completed' | 'available'

export interface CountSession {
    id: string
    group_id: string
    status: CountSessionStatus
    updated_at: string | null
    user_name: string | null
}

export interface CountGroupStatus {
    id: string
    name: string
    item_count: number
    session_id: string | null
    status: CountSessionStatus | string
    user_name: string | null
    updated_at: string | null
}
