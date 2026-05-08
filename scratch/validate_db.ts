import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function validate() {
    console.log('--- DIAGNÓSTICO DB: COZINHA CENTRAL ---')

    // 1. Rotina
    const { data: routine } = await supabase.from('routines').select('*').eq('name', 'Contagem Cozinha Central').single()
    console.log('Rotina CK:', routine ? '✅ EXISTE' : '❌ NÃO ENCONTRADA')

    // 2. Grupos
    const { data: groups } = await supabase.from('groups').select('*').eq('macro_sector', 'Cozinha Central')
    console.log('Grupos CK:', groups?.length === 6 ? `✅ 6 GRUPOS ENCONTRADOS` : `❌ ERRO: ${groups?.length} grupos`)
    groups?.forEach(g => console.log(`  - ${g.name}`))

    // 3. Vínculos
    if (routine) {
        const { data: rg } = await supabase.from('routine_groups').select('group_id').eq('routine_id', routine.id)
        console.log('Vínculos Routine-Groups:', rg?.length === 6 ? '✅ 6 VÍNCULOS' : `❌ ERRO: ${rg?.length} vínculos`)
    }

    // 4. Itens
    const { data: itemsCount } = await supabase.from('items').select('id', { count: 'exact' }).in('group_id', groups?.map(g => g.id) || [])
    console.log('Itens CK:', itemsCount && itemsCount.length >= 70 ? `✅ ${itemsCount.length} ITENS` : `❌ ERRO: ${itemsCount?.length} itens`)

    // 5. Usuário
    const { data: user } = await supabase.from('users').select('name, primary_group_id').eq('name', 'Cozinha Central').single()
    const isLinked = groups?.some(g => g.id === user?.primary_group_id)
    console.log('Usuário CK Linkado:', isLinked ? '✅ SIM' : '❌ NÃO (Primary Group ID não aponta para grupo CK)')
}

validate()
