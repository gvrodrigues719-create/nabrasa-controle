import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function validateDb() {
    console.log('--- VALIDATING DB ---')

    const { data: camboGrp, error: err1 } = await supabase.from('groups').select('id, name, unit_id').ilike('name', 'Salão%').limit(2)
    console.log('Salão group:', camboGrp, 'err:', err1?.message)

    const { data: icGrp, error: err2 } = await supabase.from('groups').select('id, name, type, unit_id').eq('id', 'e44cfad2-d8b6-4263-8d29-da25bda6518e').single()
    console.log('Icaraí Unit:', icGrp, 'err:', err2?.message)

    const { data: icGroups } = await supabase.from('groups').select('id, name, unit_id').eq('unit_id', 'e44cfad2-d8b6-4263-8d29-da25bda6518e').neq('type', 'unit')
    console.log(`Icaraí has ${icGroups?.length || 0} counting groups:`, icGroups?.map(g => g.name))

    const { data: icRout } = await supabase.from('routines').select('id, name, unit_id').eq('unit_id', 'e44cfad2-d8b6-4263-8d29-da25bda6518e')
    console.log(`Icaraí has ${icRout?.length || 0} routines:`, icRout?.map(r => r.name))
    
    // Check Camboinhas routines
    const { data: cbRout } = await supabase.from('routines').select('id, name, unit_id').eq('unit_id', '3e52d6b2-755d-4bc5-a808-b8ac37ffcee1')
    console.log(`Camboinhas has ${cbRout?.length || 0} routines.`)
}

validateDb().catch(console.error)
