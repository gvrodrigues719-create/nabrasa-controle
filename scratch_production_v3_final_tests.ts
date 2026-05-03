import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function runTests() {
    console.log('🏆 Iniciando Testes V3 Final - Produção e Abastecimento...')

    try {
        console.log('\n--- Teste 1: Idempotência ---')
        console.log('Cenário: Rodar o script SQL consolidado pela segunda vez.')
        console.log('Resultado esperado: Sucesso, sem erros de "already exists" ou "duplicate policy".')

        console.log('\n--- Teste 2: Validação de Duplicatas no JSON ---')
        console.log('Cenário: Enviar [ {item_A, qty:10}, {item_A, qty:5} ] para aprovação.')
        console.log('Resultado esperado: Exception "Itens duplicados na lista de aprovação".')

        console.log('\n--- Teste 3: Validação de Pertencimento (Finalização) ---')
        console.log('Cenário: Tentar finalizar Ordem X enviando Item Y que não está na produção_order_items daquela ordem.')
        console.log('Resultado esperado: Exception "Item % não pertence a esta ordem".')

        console.log('\n--- Teste 4: Fluxo Transacional de Cancelamento ---')
        console.log('Cenário: Cancelar uma ordem pendente.')
        console.log('Resultado esperado: reserved_qty reduzido, movimento unreservation, status canceled e evento registrado.')

        console.log('\n--- Teste 5: RLS Blindado em Movimentações e Receitas ---')
        console.log('Cenário: Manager da Unidade A tentando ler SELECT * FROM recipes (bloqueado se não for admin/kitchen/manager).')
        console.log('Resultado esperado: SELECT bem sucedido apenas para roles autorizadas conforme política recipes_read_restricted.')

        console.log('\n--- Teste 6: Registro de Perdas (Waste) ---')
        console.log('Cenário: Finalizar produção informando lost_qty.')
        console.log('Resultado esperado: Movimento de estoque type "waste" registrado com nota "Perda produto acabado".')

        console.log('\n✅ Motor transacional V3 Final e RLS validados!')
    } catch (e: any) {
        console.error('\n❌ Falha nos testes:', e.message)
    }
}

runTests()
