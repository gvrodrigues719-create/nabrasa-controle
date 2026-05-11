require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runDiagnostic() {
  console.log('Running diagnostic...');
  
  // 1. Get all items currently appearing in production (anything in internal_replenishment orders that is pending/em_separacao)
  // Actually, any item that COULD enter production. The system currently puts ALL internal_replenishment items in production planning.
  // So we just check all items that were ever requested in an internal replenishment order that is pending/enviado/em_separacao.
  const { data: storeItems, error: itemsErr } = await supabase
    .from('purchase_order_items')
    .select(`
        item_id,
        purchase_items ( id, name, category ),
        purchase_orders!inner(id, status, order_type)
    `)
    .in('purchase_orders.status', ['enviado', 'em_separacao'])
    .eq('purchase_orders.order_type', 'internal_replenishment');

  // get unique items requested
  const itemsMap = new Map();
  if (storeItems) {
      storeItems.forEach(si => {
          if (si.purchase_items) {
              itemsMap.set(si.item_id, si.purchase_items);
          }
      });
  }

  // Also, any items that have pending production orders
  const { data: scheduledItems } = await supabase
    .from('production_order_items')
    .select(`
        item_id,
        purchase_items ( id, name, category ),
        production_orders!inner(status)
    `)
    .in('production_orders.status', ['pending', 'in_progress']);

  if (scheduledItems) {
      scheduledItems.forEach(si => {
          if (si.purchase_items && !itemsMap.has(si.item_id)) {
              itemsMap.set(si.item_id, si.purchase_items);
          }
      });
  }

  // 2. Which ones have recipes?
  const itemIds = Array.from(itemsMap.keys());
  const { data: recipes } = await supabase
    .from('recipes')
    .select('product_id')
    .in('product_id', itemIds);

  const itemsWithRecipes = new Set(recipes?.map(r => r.product_id) || []);

  console.log('Item | Entrou em produção? | Tem ficha técnica? | Categoria | Ação correta');
  console.log('-'.repeat(80));

  Array.from(itemsMap.values()).sort((a,b) => a.name.localeCompare(b.name)).forEach(item => {
      const hasRecipe = itemsWithRecipes.has(item.id);
      const isPackaging = ['descartáveis', 'embalagens', 'limpeza'].some(cat => item.category?.toLowerCase().includes(cat)) || 
                          ['pote', 'saco', 'bobina', 'papel'].some(word => item.name.toLowerCase().includes(word));
      
      let acao = '';
      if (hasRecipe) acao = 'Produção';
      else if (isPackaging) acao = 'Apenas Separação';
      else acao = 'Revisar classificação';

      console.log(`${item.name.padEnd(35)} | Sim | ${hasRecipe ? 'Sim' : 'Não'} | ${String(item.category).padEnd(15)} | ${acao}`);
  });
}

runDiagnostic().catch(console.error);
