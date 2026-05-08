import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function test() {
    const { createClient } = await import('@supabase/supabase-js')
    const { initCountSessionAction } = await import('../src/app/actions/countAction')

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const {data: r} = await supabase.from('routines').select('id').eq('name', 'Contagem Cozinha Central').single()
    const {data: g} = await supabase.from('groups').select('id').eq('name', 'CK — Espetos').single()
    const {data: u} = await supabase.from('users').select('id').eq('name', 'Cozinha Central').single()

    const routineId = r?.id
    const groupId = g?.id
    const userId = u?.id
    
    console.log(`Testing with: routine=${routineId}, group=${groupId}, user=${userId}`)
    
    if (!routineId || !groupId || !userId) {
        console.error('Missing IDs!')
        return
    }

    try {
        const res = await initCountSessionAction(routineId, groupId, userId)
        console.log('Result:', JSON.stringify(res, null, 2))
    } catch (e) {
        console.error('FATAL ERROR:', e)
    }
}

test()
