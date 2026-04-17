'use server'

import { createClient } from '@supabase/supabase-js'
import { getStartOfOperationalWeek } from '@/lib/dateUtils'
import { getOperationalHealthAction } from './efficiencyAction'
import { requireManagerOrAdmin } from '@/lib/auth-utils'

const supabase = new Proxy({} as any, {
    get(target, prop) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY // Service role for internal writes
        if (!url || !key) throw new Error("Ambiente Vercel incompleto: Faltam chaves de banco de dados.")
        const client = createClient(url, key)
        const value = client[prop as keyof typeof client]
        return typeof value === 'function' ? value.bind(client) : value
    }
})

export type WeeklyFocus = {
    week_start: string
    title: string
    source: 'suggested' | 'manual'
    updated_by?: string
}

export async function getWeeklyFocusAction() {
    try {
        const weekStart = getStartOfOperationalWeek().split('T')[0] // YYYY-MM-DD
        
        // 1. Tentar buscar o foco existente da semana
        const { data: existingFocus } = await supabase
            .from('weekly_focus')
            .select('*')
            .eq('week_start', weekStart)
            .maybeSingle()

        if (existingFocus) {
            return { success: true, data: existingFocus as WeeklyFocus }
        }

        // 2. Se não existir, gerar sugestão automática
        // Busca a saúde atual (que já tem leaks de checklist, rupture, losses, cmv/stuck sessions)
        const healthRes = await getOperationalHealthAction()
        let suggestedTitle = 'Manter a operação dentro da meta da casa e padrões de qualidade.' // default

        if (healthRes.success) {
            const allLeaks = [...(healthRes.activeLeaks || []), ...(healthRes.weeklyLeaks || [])]
            
            const hasChecklistIssues = allLeaks.some(l => l.type === 'checklist')
            const hasRuptures = allLeaks.some(l => l.type === 'rupture')
            const hasManyLosses = allLeaks.filter(l => l.type === 'reported_loss').length >= 3 // "muitas perdas"
            // Nota: Se houver CMV estourado, podemos olhar também. No healthScore já tem peso.
            // A prioridade definida pelo usuário: Checklist > Rupturas > Perdas > Default

            if (hasChecklistIssues) {
                suggestedTitle = 'Fechar rotinas e checklists sem pendência crítica.'
            } else if (hasRuptures) {
                suggestedTitle = 'Evitar ruptura e furos nos itens críticos do estoque.'
            } else if (hasManyLosses) {
                suggestedTitle = 'Registrar perdas no momento certo e reduzir desperdício diário.'
            }
        }

        const newFocus: WeeklyFocus = {
            week_start: weekStart,
            title: suggestedTitle,
            source: 'suggested'
        }

        // 3. Salva a sugestão no banco para fixar na semana
        // Se der erro porque já inseriram concorrentemente, a gente engole ou tenta select de novo.
        const { error } = await supabase.from('weekly_focus').insert([newFocus])
        
        return { success: true, data: newFocus }
        
    } catch (error: any) {
        console.error('Error in getWeeklyFocusAction:', error)
        // Fallback seguro em caso da tabela não existir ainda ou falha de conexão
        return { 
            success: true, 
            data: { 
                week_start: '2020-01-01', 
                title: 'Manter a operação funcionando na meta.',
                source: 'suggested' 
            } 
        }
    }
}

export async function updateWeeklyFocusAction(title: string) {
    try {
        const userId = await requireManagerOrAdmin()
        
        const weekStart = getStartOfOperationalWeek().split('T')[0]
        
        const { error } = await supabase.from('weekly_focus')
            .upsert({
                week_start: weekStart,
                title: title,
                source: 'manual',
                updated_by: userId
            })
            
        if (error) throw new Error(error.message)
        
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
