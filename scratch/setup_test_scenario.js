
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setup() {
  console.log('--- SETUP CENÁRIO DE TESTE ---');

  const COZINHA_GROUP_ID = '91919191-9191-4919-9191-919191919191';
  const CONTAGEM_COZINHA_ID = '8503b220-819c-4db9-8d9e-bce241f75aae';
  const TEMPLATE_ABERTURA_COZINHA_ID = '821a5173-9c2e-4f86-aa95-459f842beb80';

  // 1. Criar/Atualizar Usuário de Teste
  // Usamos um ID fixo ou buscamos pelo nome
  const { data: user, error: userErr } = await supabase
    .from('users')
    .upsert({
      name: 'Operador Teste',
      role: 'operator',
      pin: '1234',
      primary_group_id: COZINHA_GROUP_ID,
      active: true
    }, { onConflict: 'name' })
    .select()
    .single();

  if (userErr) {
    console.error('Erro ao criar usuário:', userErr);
  } else {
    console.log('✅ Usuário "Operador Teste" criado/atualizado. ID:', user.id);
  }

  // 2. Garantir que a Rotina de Contagem está vinculada
  const { error: rgErr1 } = await supabase
    .from('routine_groups')
    .upsert({
      routine_id: CONTAGEM_COZINHA_ID,
      group_id: COZINHA_GROUP_ID
    }, { onConflict: 'routine_id, group_id' });

  if (rgErr1) console.error('Erro ao vincular contagem:', rgErr1);
  else console.log('✅ Rotina "Contagem Cozinha" vinculada ao grupo Cozinha (Carnes).');

  // 3. Criar/Identificar Rotina de Checklist
  // Verificamos se já existe uma rotina de checklist ativa para este template
  let { data: checklistRoutine } = await supabase
    .from('routines')
    .select('id')
    .eq('checklist_template_id', TEMPLATE_ABERTURA_COZINHA_ID)
    .eq('active', true)
    .maybeSingle();

  if (!checklistRoutine) {
    const { data: newRoutine, error: nrErr } = await supabase
      .from('routines')
      .insert({
        name: 'Checklist Diário Cozinha',
        routine_type: 'checklist',
        checklist_template_id: TEMPLATE_ABERTURA_COZINHA_ID,
        active: true
      })
      .select()
      .single();
    
    if (nrErr) {
        console.error('Erro ao criar rotina de checklist:', nrErr);
    } else {
        checklistRoutine = newRoutine;
        console.log('✅ Nova rotina de Checklist criada:', checklistRoutine.id);
    }
  } else {
    console.log('✅ Rotina de Checklist já existente encontrada:', checklistRoutine.id);
  }

  // 4. Vincular Checklist ao Grupo
  if (checklistRoutine) {
    const { error: rgErr2 } = await supabase
      .from('routine_groups')
      .upsert({
        routine_id: checklistRoutine.id,
        group_id: COZINHA_GROUP_ID
      }, { onConflict: 'routine_id, group_id' });

    if (rgErr2) console.error('Erro ao vincular checklist:', rgErr2);
    else console.log('✅ Rotina de Checklist vinculada ao grupo Cozinha (Carnes).');
  }

  console.log('--- SETUP CONCLUÍDO ---');
}

setup();
