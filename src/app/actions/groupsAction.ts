'use server'

import { createClient } from '@supabase/supabase-js'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CUTOFF_OPENING = 11
const CUTOFF_CLOSING = 23
const STUCK_SESSION_HOURS = 4

export type AreaStatus = 'completed' | 'pending' | 'delayed' | 'attention' | 'critical' | 'none'

export interface AreaDiagnostic {
    id: string
    name: string
    progress: number
    status: AreaStatus
    lastUpdate: string
    routinesCount: number
    completedCount: number
}

export async function getAreasDiagnosticAction() {
    try {
        // 1. Data Operacional (Brasília)
        const brDate = new Intl.DateTimeFormat('en-CA', { 
            timeZone: 'America/Sao_Paulo', 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
        }).format(new Date())
        const startOfDayBR = `${brDate}T03:00:00Z`
        const now = new Date()
        const currentHour = now.getHours() // Local time (assuming server is synced or we adjust)
        // Better: get hour in BRT specifically
        const brHour = parseInt(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }).format(new Date()))

        // 2. Fetch de Dados
        const [groupsRes, routinesRes, routineGroupsRes, countSessionsRes, checklistSessionsRes] = await Promise.all([
            supabase.from('groups').select('id, name'),
            supabase.from('routines').select('id, name, routine_type').eq('active', true),
            supabase.from('routine_groups').select('routine_id, group_id'),
            supabase.from('count_sessions').select('routine_id, group_id, status, started_at, updated_at').gte('started_at', startOfDayBR),
            supabase.from('checklist_sessions').select('routine_id, group_id, status, started_at, updated_at').gte('started_at', startOfDayBR)
        ])

        if (groupsRes.error) throw groupsRes.error

        const groups = groupsRes.data || []
        const activeRoutines = routinesRes.data || []
        const routineGroups = routineGroupsRes.data || []
        const sessions = [...(countSessionsRes.data || []), ...(checklistSessionsRes.data || [])]

        // 3. Processamento
        const diagnostics: AreaDiagnostic[] = groups.map(group => {
            // Routines linked to this group
            const assignedRoutineIds = routineGroups
                .filter(rg => rg.group_id === group.id)
                .map(rg => rg.routine_id)
            
            const groupRoutines = activeRoutines.filter(r => assignedRoutineIds.includes(r.id))
            const totalRoutines = groupRoutines.length
            
            // Sessions for this group today
            const groupSessions = sessions.filter(s => s.group_id === group.id)
            const completedSessions = groupSessions.filter(s => s.status === 'completed')
            
            // Progress
            const progress = totalRoutines > 0 ? Math.round((completedSessions.length / totalRoutines) * 100) : 100
            
            // Status Logic
            let status: AreaStatus = 'pending'
            if (totalRoutines === 0) {
                status = 'none'
            } else if (progress === 100) {
                status = 'completed'
            } else {
                const stuckTime = new Date(now.getTime() - STUCK_SESSION_HOURS * 60 * 60 * 1000)
                const hasStuckSession = groupSessions.some(s => s.status === 'in_progress' && new Date(s.started_at) < stuckTime)
                
                // Cutoff checks
                const hasOpeningPending = groupRoutines.some(r => r.name.toLowerCase().includes('abertura')) && brHour >= CUTOFF_OPENING && !groupSessions.some(s => s.status === 'completed' && activeRoutines.find(ar => ar.id === s.routine_id)?.name.toLowerCase().includes('abertura'))
                const hasClosingPending = groupRoutines.some(r => r.name.toLowerCase().includes('fechamento')) && brHour >= CUTOFF_CLOSING && !groupSessions.some(s => s.status === 'completed' && activeRoutines.find(ar => ar.id === s.routine_id)?.name.toLowerCase().includes('fechamento'))

                if (hasStuckSession || hasOpeningPending || hasClosingPending) {
                    status = progress < 30 ? 'critical' : 'delayed'
                } else if (progress > 0) {
                    status = 'attention'
                }
            }


            // Last Update
            let lastUpdate = 'Sem registros'
            if (groupSessions.length > 0) {
                const latest = groupSessions.reduce((prev, curr) => 
                    new Date(curr.updated_at) > new Date(prev.updated_at) ? curr : prev
                )
                lastUpdate = formatUpdateLabel(latest.updated_at)
            }

            return {
                id: group.id,
                name: group.name,
                progress,
                status,
                lastUpdate,
                routinesCount: totalRoutines,
                completedCount: completedSessions.length
            }
        })

        return { success: true, data: diagnostics }
    } catch (err: any) {
        console.error('[GroupsAction] Error in getAreasDiagnosticAction:', err.message)
        return { success: false, error: err.message }
    }
}


const MACRO_SECTOR_MAP: Record<string, string> = {
    'Cozinha (Carnes)': 'Cozinha',
    'Cozinha (Geral)': 'Cozinha',
    'Hortifruti': 'Cozinha',
    'Cozinha Principal': 'Cozinha',
    'Produção': 'Cozinha',
    'Salão': 'Salão',
    'Salão Principal': 'Salão',
    'Limpeza': 'Salão',
    'Banheiros': 'Salão',
    'Apoio': 'Salão',
    'Caixa': 'Caixa',
    'Caixa Central': 'Caixa',
    'Copa': 'Caixa',
    'Estoque': 'Logística',
    'Almoxarifado': 'Logística',
    'Delivery': 'Logística',
    'Delivery Express': 'Logística',
    'Churrasqueira': 'Churrasqueira',
    'Churrasqueira (Área)': 'Churrasqueira',
    'Grelha': 'Churrasqueira'
}

export async function getMacroDiagnosticAction() {
    const res = await getAreasDiagnosticAction()
    if (!res.success || !res.data) return res

    const microDiagnostics = res.data
    const macroMap: Record<string, AreaDiagnostic & { microCount: number }> = {}

    microDiagnostics.forEach(micro => {
        const macroName = MACRO_SECTOR_MAP[micro.name] || micro.name
        
        if (!macroMap[macroName]) {
            macroMap[macroName] = {
                id: `macro-${macroName}`,
                name: macroName,
                progress: 0,
                status: 'none',
                lastUpdate: micro.lastUpdate,
                routinesCount: 0,
                completedCount: 0,
                microCount: 0
            }
        }

        const macro = macroMap[macroName]
        macro.routinesCount += micro.routinesCount
        macro.completedCount += micro.completedCount
        macro.microCount += 1

        // Status precedence: critical > delayed > attention > pending > completed > none
        const statusPriority: Record<AreaStatus, number> = {
            'critical': 5,
            'delayed': 4,
            'attention': 3,
            'pending': 2,
            'completed': 1,
            'none': 0
        }

        if (statusPriority[micro.status] > statusPriority[macro.status]) {
            macro.status = micro.status
        }
    })

    // Final calculation
    const macroList: AreaDiagnostic[] = Object.values(macroMap).map(macro => {
        const progress = macro.routinesCount > 0 
            ? Math.round((macro.completedCount / macro.routinesCount) * 100) 
            : 100
        
        return {
            ...macro,
            progress
        }
    })

    return { success: true, data: macroList }
}

function formatUpdateLabel(dateStr: string) {
    const date = new Date(dateStr)
    const diffMs = Date.now() - date.getTime()
    const diffMin = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffMin < 1) return 'Agora mesmo'
    if (diffMin < 60) return `Há ${diffMin} min`
    if (diffHours < 24) return `Há ${diffHours} h`
    return format(date, "dd/MM 'às' HH:mm", { locale: ptBR })
}
