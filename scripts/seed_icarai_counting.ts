import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function runSeed() {
    console.log('Iniciando seed de Icaraí...')
    
    // 1. Identificar Camboinhas
    const { data: camboinhas } = await supabase
        .from('groups')
        .select('id')
        .eq('type', 'unit')
        .ilike('name', '%camboinhas%')
        .single()
        
    if (!camboinhas) {
        throw new Error('Unidade Camboinhas não encontrada')
    }
    const camboinhasId = camboinhas.id
    console.log(`✓ Camboinhas ID: ${camboinhasId}`)

    // 2. Criar Unidade Icaraí (se não existir)
    let { data: icarai } = await supabase
        .from('groups')
        .select('id')
        .eq('type', 'unit')
        .ilike('name', '%icarai%')
        .maybeSingle()

    if (!icarai) {
        const { data: newUnit, error } = await supabase
            .from('groups')
            .insert([{
                name: 'NaBrasa Icaraí',
                description: 'Unidade Icaraí',
                order_index: 1,
                active: true,
                type: 'unit'
            }])
            .select('id')
            .single()
        if (error) throw error
        icarai = newUnit
        console.log(`✓ Unidade Icaraí CRIADA: ${icarai?.id}`)
    } else {
        console.log(`✓ Unidade Icaraí JÁ EXISTIA: ${icarai.id}`)
    }
    const icaraiId = icarai!.id

    // 3. Criar usuário Operação Icaraí
    let { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('name', 'Operação Icaraí')
        .maybeSingle()
        
    if (!user) {
        // Primeiro cria no auth.users
        const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
            email: 'operacao.icarai@nabrasa.com.br',
            password: 'senha_provisoria_123',
            email_confirm: true
        })

        if (authErr && !authErr.message.toLowerCase().includes('already')) {
            throw new Error(`Erro ao criar usuário Auth: ${authErr.message}`)
        }

        let newUserId = authData?.user?.id
        if (!newUserId) {
            // Se já existe, vamos buscar
            const { data: listUsers } = await supabase.auth.admin.listUsers()
            const existingAuth = listUsers?.users.find(u => u.email === 'operacao.icarai@nabrasa.com.br')
            if (existingAuth) newUserId = existingAuth.id
        }
        if (!newUserId) throw new Error('Não foi possível obter o ID do usuário criado')

        const { data: newUser, error } = await supabase
            .from('users')
            .upsert([{
                id: newUserId,
                name: 'Operação Icaraí',
                email: 'operacao.icarai@nabrasa.com.br',
                role: 'operator',
                active: true,
                unit_id: icaraiId
            }])
            .select('id')
            .single()
        if (error) throw error
        user = newUser
        console.log(`✓ Usuário Operação Icaraí CRIADO: ${user?.id}`)

        // Tentar definir PIN inicial 1234
        const pin = '1234'
        const { error: pinErr } = await supabase.rpc('set_user_pin', { p_user_id: user?.id, p_pin: pin })
        if (pinErr) {
            console.log(`⚠️  Não foi possível usar a RPC set_user_pin. O PIN precisará ser cadastrado no painel.`)
        } else {
            console.log(`✓ PIN inicial configurado para 1234`)
        }
    } else {
        console.log(`✓ Usuário Operação Icaraí JÁ EXISTIA: ${user.id}`)
    }

    // 4. Clonar Rotinas de Camboinhas
    const { data: routines } = await supabase
        .from('routines')
        .select('*')
        .eq('unit_id', camboinhasId)
        .eq('active', true)
        
    if (!routines || routines.length === 0) {
        console.log('Nenhuma rotina para clonar (você já rodou a migration?).')
        return
    }

    for (const r of routines) {
        // Verifica se já existe para Icaraí
        const { data: existingR } = await supabase
            .from('routines')
            .select('id')
            .eq('unit_id', icaraiId)
            .eq('name', r.name)
            .maybeSingle()

        let newRoutineId = existingR?.id
        if (!existingR) {
            const { data: insR, error } = await supabase
                .from('routines')
                .insert([{
                    name: r.name,
                    frequency: r.frequency,
                    week_days: r.week_days,
                    active: true,
                    routine_type: r.routine_type,
                    checklist_template_id: r.checklist_template_id,
                    unit_id: icaraiId
                }])
                .select('id')
                .single()
            if (error) throw error
            newRoutineId = insR?.id
            console.log(`✓ Rotina clonada: ${r.name}`)
        } else {
            console.log(`  Rotina já existe: ${r.name}`)
        }

        // Clonar Grupos
        const { data: rgs } = await supabase
            .from('routine_groups')
            .select('group_id')
            .eq('routine_id', r.id)

        if (rgs) {
            for (const rg of rgs) {
                const { data: oldGroup } = await supabase
                    .from('groups')
                    .select('*')
                    .eq('id', rg.group_id)
                    .single()

                if (oldGroup) {
                    // Tenta achar grupo com mesmo nome para Icaraí
                    let { data: icaraiGroup } = await supabase
                        .from('groups')
                        .select('id')
                        .eq('unit_id', icaraiId)
                        .eq('name', oldGroup.name)
                        .maybeSingle()

                    if (!icaraiGroup) {
                        const { data: newGroup, error: gErr } = await supabase
                            .from('groups')
                            .insert([{
                                name: oldGroup.name,
                                macro_sector: oldGroup.macro_sector,
                                description: oldGroup.description,
                                order_index: oldGroup.order_index,
                                active: true,
                                type: oldGroup.type,
                                unit_id: icaraiId
                            }])
                            .select('id')
                            .single()
                        if (gErr) throw gErr
                        icaraiGroup = newGroup
                        console.log(`    ✓ Grupo clonado: ${oldGroup.name}`)

                        // Clonar Itens para este novo grupo
                        const { data: items } = await supabase
                            .from('items')
                            .select('*')
                            .eq('group_id', oldGroup.id)
                            .eq('active', true)

                        if (items && items.length > 0) {
                            const newItems = items.map(i => ({
                                name: i.name,
                                code: i.code,
                                unit: i.unit,
                                unit_observation: i.observation,
                                min_expected: i.min_expected,
                                max_expected: i.max_expected,
                                group_id: icaraiGroup!.id,
                                active: true,
                                cost_mode: i.cost_mode,
                                average_cost: 0 // Iniciar sem custo
                            }))

                            const { error: iErr } = await supabase.from('items').insert(newItems)
                            if (iErr) throw iErr
                            console.log(`      ✓ ${newItems.length} itens clonados.`)
                        }
                    }

                    // Vincular grupo à rotina
                    const { data: existingRg } = await supabase
                        .from('routine_groups')
                        .select('id')
                        .eq('routine_id', newRoutineId)
                        .eq('group_id', icaraiGroup!.id)
                        .maybeSingle()

                    if (!existingRg) {
                        await supabase.from('routine_groups').insert([{
                            routine_id: newRoutineId,
                            group_id: icaraiGroup!.id
                        }])
                    }
                }
            }
        }
    }
    
    console.log('✅ Seed finalizado com sucesso!')
}

runSeed().catch(console.error)
