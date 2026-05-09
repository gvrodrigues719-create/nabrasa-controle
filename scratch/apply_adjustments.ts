import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function applyAdjustments() {
    console.log('--- INICIANDO AJUSTES COZINHA CENTRAL (MODO ROBUSTO) ---')

    const { data: routine } = await supabase.from('routines').select('id').eq('name', 'Contagem Cozinha Central').single()
    if (!routine) return console.error('Rotina não encontrada.')
    const routineId = routine.id

    async function getOrCreateGroup(name: string) {
        const { data: existing } = await supabase.from('groups').select('id').eq('name', name).eq('macro_sector', 'Cozinha Central').maybeSingle()
        if (existing) return existing.id
        const { data: created } = await supabase.from('groups').insert({ name, macro_sector: 'Cozinha Central', active: true }).select('id').single()
        return created?.id
    }

    const groupInsumosId = await getOrCreateGroup('CK — Insumos')
    const groupCarnesId = await getOrCreateGroup('CK — Carnes e Frios — Insumos')
    const groupLimpezaId = await getOrCreateGroup('CK — Produtos de Limpeza')

    if (!groupInsumosId || !groupCarnesId || !groupLimpezaId) return console.error('Erro ao garantir grupos.')

    await supabase.from('routine_groups').upsert({ routine_id: routineId, group_id: groupLimpezaId }, { onConflict: 'routine_id,group_id' })

    async function upsertItem(groupId: string, name: string, unit: string) {
        const { data: existing } = await supabase.from('items').select('id').eq('group_id', groupId).eq('name', name).maybeSingle()
        if (existing) {
            await supabase.from('items').update({ unit, active: true }).eq('id', existing.id)
        } else {
            await supabase.from('items').insert({ group_id: groupId, name, unit, active: true })
        }
    }

    const insumos = [
        ['MARGARINA', 'KG'], ['LEITE CONDENSADO', 'CAIXINHA'], ['ARROZ', 'KG'], ['ALHO', 'KG'],
        ['AÇÚCAR MASCAVO', 'KG'], ['PIMENTA BIQUINHA', 'BALDE'], ['FEIJÃO PRODUZIDO', 'KG'],
        ['VINAGRE', 'UN'], ['AZEITE 2L', 'UN'], ['ÓLEO 900ML', 'UN'], ['LEITE', 'CAIXA'],
        ['REQUEIJÃO 1,5KG', 'BISNAGA']
    ]
    for (const [n, u] of insumos) await upsertItem(groupInsumosId, n, u)
    await upsertItem(groupCarnesId, 'SOBRECOXA', 'KG')
    
    const limpeza = [['ALVEJANTE HIPOCLORITO DE SÓDIO 2,5% - 5L', 'UN'], ['HIPOCLORITO DE SÓDIO 5% - 5L', 'UN'], ['DESINFETANTE 5L', 'UN']]
    for (const [n, u] of limpeza) await upsertItem(groupLimpezaId, n, u)

    console.log('--- AJUSTES FINALIZADOS ---')
}

applyAdjustments()
