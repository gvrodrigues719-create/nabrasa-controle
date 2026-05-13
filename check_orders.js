const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllOrders() {
  console.log('--- CHECKING ALL INTERNAL REPLENISHMENT ORDERS ---\n');

  const { data: orders, error } = await supabase
    .from('purchase_orders')
    .select('id, status, order_type, created_at')
    .eq('order_type', 'internal_replenishment')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error(error);
    return;
  }

  console.table(orders);

  // Check if there are any items linked to 'Cozinha Central' items
  console.log('\n--- CHECKING PURCHASE ITEMS CLASSIFICATION ---');
  const { data: items } = await supabase
    .from('purchase_items')
    .select('id, name, item_type, is_active')
    .limit(20);
  
  console.table(items);

  // Check mandatory items classification
  const mandatory = [
    'Espeto Frango', 'Espeto Baby Beef', 'Espeto Coração', 
    'Feijão Cozido', 'Farofa', 'Molho Gorgonzola', 
    'Pote 145ML', 'Embalagem de Isopor', 'Assa Rápido'
  ];

  console.log('\n--- MANDATORY ITEMS CLASSIFICATION ---');
  const { data: mItems } = await supabase
    .from('purchase_items')
    .select('id, name, item_type')
    .or(mandatory.map(m => `name.ilike.%${m}%`).join(','));
  
  console.table(mItems);
}

checkAllOrders();
