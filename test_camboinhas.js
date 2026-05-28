const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'C:/Users/Guilherme/.gemini/antigravity/playground/neon-copernicus/web-app/.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Real Users
const USER_CAMBOINHAS_ID = 'ed2f6d22-6e89-4aa5-89d7-bd432f2d349f';    // Operador Camboinhas (Loja Camboinhas)
const USER_ICARAI_ID = 'b4ac5ffd-40c3-46b1-9508-a1219cb925b6';       // Guilherme Gerente (Icaraí)
const USER_COZINHA_ID = 'b63649c8-779a-4387-b8f3-b276774c9c4a';      // Cozinha Central (operator, unit: null)

// Rotinas e Grupos
const ROUTINE_STORE_ID = '8503b220-819c-4db9-8d9e-bce241f75aae'; // Contagem Cozinha (global)
const GROUP_CARNES_ID = '0241bc36-02b2-4a7f-8c84-27ab83d03bd3'; // Carnes, Espetos e Resfriados

async function cleanMockSessions() {
    await supabase.from('count_sessions').delete().eq('group_id', GROUP_CARNES_ID);
}

async function runTests() {
    const { initCountSessionAction, syncCountSessionAction } = require('./src/app/actions/countAction');

    console.log('\n=== INICIANDO VALIDAÇÃO DE CONTAGEM CAMBOINHAS ===\n');

    await cleanMockSessions();

    let passed = 0;
    let total = 6;

    try {
        // --- TESTE 1: INÍCIO E PREENCHIMENTO BÁSICO ---
        process.env.TEST_USER_ID = USER_CAMBOINHAS_ID;
        console.log('1. Iniciando sessão como Operador Camboinhas no grupo Carnes...');
        const s1 = await initCountSessionAction(ROUTINE_STORE_ID, GROUP_CARNES_ID, USER_CAMBOINHAS_ID);
        
        if (s1.error || s1.blocked) {
            console.error('   [FAIL] Erro ao iniciar sessão:', s1.error || s1.blocked);
            return;
        }
        console.log('   [PASS] Sessão iniciada. ID:', s1.sessionId);
        passed++;

        // --- TESTE 2: TESTE DE QUANTIDADE ZERO E ITEM ZERADO ---
        console.log('\n2. Testando sincronização com quantidade 0 (valor numérico) e item zerado (flag is_zeroed)...');
        
        // Simulando contagem de 2 itens
        const itemsToCount = s1.items;
        if (itemsToCount.length < 2) throw new Error("Itens insuficientes no grupo");

        const countsDict = { [itemsToCount[0].id]: "0" }; // Quantidade 0 literal
        const zeroedDict = { [itemsToCount[1].id]: true }; // Flag zerado
        
        const sync1 = await syncCountSessionAction(s1.sessionId, countsDict, false, zeroedDict);
        
        if (sync1.success) {
            console.log('   [PASS] Sincronização parcial bem-sucedida. Ambos (qte 0 e zerado) salvos.');
            passed++;
        } else {
            console.error('   [FAIL] Erro na sincronização:', sync1);
        }

        // --- TESTE 3: SESSÃO INVÁLIDA ---
        console.log('\n3. Testando finalização de sessão inválida...');
        const fakeSessionId = '00000000-0000-0000-0000-000000000000';
        const syncInvalid = await syncCountSessionAction(fakeSessionId, countsDict, true, zeroedDict);
        
        if (syncInvalid.error && syncInvalid.error.includes('Sessão não encontrada')) {
            console.log('   [PASS] Erro "Sessão não encontrada" recebido corretamente (exigido pelo fluxo de recuperação).');
            passed++;
        } else {
            console.error('   [FAIL] Mensagem de erro de sessão inválida incorreta:', syncInvalid.error);
        }

        // --- TESTE 4: SESSÃO TRAVADA (Outro Operador) ---
        console.log('\n4. Testando sessão travada (iniciada por outro operador)...');
        // Garantir que USER_ICARAI_ID seja um manager de unidade diferente, mas com grupo primário válido para não ser barrado no escopo global
        const { error: updErr } = await supabase.from('users').update({ 
            role: 'manager', 
            unit_id: '74b3608e-16f4-4ef8-bc5c-33c1495b2e9a',
            primary_group_id: GROUP_CARNES_ID
        }).eq('id', USER_ICARAI_ID);
        if (updErr) console.error("Update error:", updErr);
        
        process.env.TEST_USER_ID = USER_ICARAI_ID;
        const s2 = await initCountSessionAction(ROUTINE_STORE_ID, GROUP_CARNES_ID, USER_ICARAI_ID);
        if (s2.blocked && s2.blocked.includes('está sendo contado por')) {
            console.log('   [PASS] Bloqueio por sessão travada funcionou:', s2.blocked);
            passed++;
        } else {
            console.error('   [FAIL] Não bloqueou acesso cruzado corretamente.', s2);
        }

        // --- TESTE 5: SESSÃO INVÁLIDA MAS ITEM PENDENTE (Mensagem Atualizada) ---
        console.log('\n5. Testando bloqueio com item pendente (Via Endpoint)...');
        process.env.TEST_USER_ID = USER_CAMBOINHAS_ID;
        console.log('   Debug: sess_id =', s1.sessionId, 'user =', USER_CAMBOINHAS_ID);
        const syncPending = await syncCountSessionAction(s1.sessionId, countsDict, true, zeroedDict);
        if (syncPending.error && syncPending.error.includes('Inconsistência')) {
            console.log('   [PASS] Backend validou itens pendentes e bloqueou finalização (Mensagem de falha segura).');
            passed++;
        } else {
            console.error('   [FAIL] Backend não bloqueou finalização com itens pendentes.', syncPending);
        }

        // --- TESTE 6: FINALIZAÇÃO REAL BEM-SUCEDIDA ---
        console.log('\n6. Testando finalização completa...');
        const finalCountsDict = {};
        for(let i=0; i<itemsToCount.length; i++) {
            finalCountsDict[itemsToCount[i].id] = "1";
        }
        process.env.TEST_USER_ID = USER_CAMBOINHAS_ID;
        const syncFinal = await syncCountSessionAction(s1.sessionId, finalCountsDict, true, {});
        if (syncFinal.success && syncFinal.status === 'completed') {
            console.log('   [PASS] Contagem finalizada com sucesso!');
            passed++;
        } else {
            console.error('   [FAIL] Falha ao finalizar contagem:', syncFinal.error);
        }

    } catch (e) {
        console.error('\nErro inesperado durante os testes:', e);
    } finally {
        console.log(`\n=== RESULTADO FINAL: ${passed}/${total} PASSARAM ===`);
        process.exit(passed === total ? 0 : 1);
    }
}

runTests();
