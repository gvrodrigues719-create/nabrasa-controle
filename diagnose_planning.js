const { createClient } = require('@supabase/supabase-js');

// Use environment variables or hardcoded for temporary diagnostic
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosePlanning() {
  console.log('--- STARTING PLANNING DIAGNOSIS ---\n');

  // 1. Pedidos pendentes
  console.log('1. Checking pending internal replenishment orders...');
  const { data: pendingOrders, error: ordersErr } = await supabase
    .from('purchase_orders')
    .select(`
      id, status, order_type, destination_location_id, created_at,
      purchase_order_items (
        id, item_id, requested_qty
      )
    `)
    .in('status', ['enviado', 'em_separacao'])
    .eq('order_type', 'internal_replenishment');

  if (ordersErr) {
    console.error('Error fetching pending orders:', ordersErr);
    return;
  }

  console.log(`Found ${pendingOrders.length} pending orders.`);
  
  const allItemIds = new Set();
  const ordersSummary = pendingOrders.map(o => {
    o.purchase_order_items.forEach(i => allItemIds.add(i.item_id));
    return {
      id: o.id,
      status: o.status,
      items_count: o.purchase_order_items.length,
      created_at: o.created_at
    };
  });
  console.table(ordersSummary);

  if (allItemIds.size === 0) {
    console.log('No pending items found in orders.');
    return;
  }

  // 2. Detalhes dos Itens
  console.log('\n2. Fetching item details and mappings...');
  const { data: itemDetails, error: itemsErr } = await supabase
    .from('purchase_items')
    .select('id, name, item_type, category')
    .in('id', Array.from(allItemIds));

  if (itemsErr) {
    console.error('Error fetching item details:', itemsErr);
    return;
  }

  const { data: mappings, error: mapErr } = await supabase
    .from('count_to_purchase_item_map')
    .select('count_item_id, purchase_item_id')
    .in('purchase_item_id', Array.from(allItemIds));

  const mappingMap = new Map();
  mappings?.forEach(m => mappingMap.set(m.purchase_item_id, m.count_item_id));

  // 3. Produção agendada
  const { data: scheduledItems, error: scheduledErr } = await supabase
    .from('production_order_items')
    .select(`
      item_id, approved_qty,
      production_orders!inner(status)
    `)
    .in('production_orders.status', ['pending', 'in_progress']);

  const scheduledMap = {};
  scheduledItems?.forEach(si => {
    scheduledMap[si.item_id] = (scheduledMap[si.item_id] || 0) + Number(si.approved_qty);
  });

  // 4. Última contagem CK
  console.log('\n3. Checking last CK counts...');
  const countItemIds = Array.from(new Set(mappings?.map(m => m.count_item_id) || []));
  const lastCountMap = {};

  if (countItemIds.length > 0) {
    const { data: countData, error: countErr } = await supabase
      .from('count_session_items')
      .select(`
        item_id, counted_quantity, is_zeroed, validated_quantity, validated_is_zeroed,
        count_sessions!inner(
          completed_at, status,
          groups!inner(name, macro_sector)
        )
      `)
      .in('item_id', countItemIds)
      .eq('count_sessions.status', 'completed')
      .or('macro_sector.eq.Cozinha Central,name.ilike.CK%', { foreignTable: 'count_sessions.groups' });

    if (countErr) {
      console.error('Error fetching count data:', countErr);
    } else if (countData) {
      countData.sort((a, b) => new Date(b.count_sessions.completed_at) - new Date(a.count_sessions.completed_at));
      countData.forEach(c => {
        if (!lastCountMap[c.item_id]) {
          const isZero = c.validated_is_zeroed ?? c.is_zeroed;
          const qty = isZero ? 0 : (c.validated_quantity ?? c.counted_quantity);
          lastCountMap[c.item_id] = {
            qty: Number(qty),
            date: c.count_sessions.completed_at,
            group: c.count_sessions.groups?.name
          };
        }
      });
    }
  }

  // 5. Build full table
  const diagnosticTable = [];
  const mandatoryItems = [
    'Espeto Frango', 'Espeto Baby Beef', 'Espeto Coração', 
    'Feijão Cozido', 'Farofa', 'Molho Gorgonzola', 
    'Pote 145ML', 'Embalagem de Isopor', 'Assa Rápido'
  ];

  // We need to look at all items in pending orders, not just mandatory
  itemDetails.forEach(item => {
    const countItemId = mappingMap.get(item.id);
    const lastCount = countItemId ? lastCountMap[countItemId] : null;
    const requested = pendingOrders.reduce((sum, o) => {
      const it = o.purchase_order_items.find(i => i.item_id === item.id);
      return sum + (it ? Number(it.requested_qty) : 0);
    }, 0);
    const scheduled = scheduledMap[item.id] || 0;
    const ready = lastCount ? lastCount.qty : 0;
    const suggested = Math.max(0, requested - ready - scheduled);

    let planning_category = 'review';
    let review_reason = '';

    if (item.item_type === 'produced') {
        planning_category = 'production';
        if (!countItemId) {
            planning_category = 'review';
            review_reason = 'Sem vínculo contagem';
        } else if (!lastCount) {
            planning_category = 'review';
            review_reason = 'Sem contagem CK';
        }
    } else if (item.item_type === 'separated') {
        planning_category = 'separation';
    } else {
        review_reason = 'Item unclassified';
    }

    diagnosticTable.push({
      purchase_item_id: item.id.substring(0, 8),
      name: item.name,
      type: item.item_type,
      requested,
      ready,
      scheduled,
      suggested,
      category: planning_category,
      has_map: !!countItemId,
      count_group: lastCount?.group || '-',
      count_date: lastCount?.date ? new Date(lastCount.date).toLocaleDateString() : '-',
      reason: review_reason
    });
  });

  console.log('\n--- DETAILED DIAGNOSTIC TABLE ---');
  console.table(diagnosticTable);

  // Mandatory Items Specific Check
  console.log('\n--- MANDATORY ITEMS VALIDATION ---');
  mandatoryItems.forEach(mName => {
    const found = diagnosticTable.find(row => row.name.toLowerCase().includes(mName.toLowerCase()));
    if (found) {
      console.log(`[OK] ${mName}: Found in orders. Category: ${found.category}. Reason: ${found.reason || 'N/A'}`);
    } else {
      console.log(`[MISSING] ${mName}: Not found in pending orders.`);
    }
  });

  console.log('\n--- DIAGNOSIS SUMMARY ---');
  const prodCount = diagnosticTable.filter(t => t.category === 'production').length;
  const sepCount = diagnosticTable.filter(t => t.category === 'separation').length;
  const revCount = diagnosticTable.filter(t => t.category === 'review').length;
  console.log(`Production: ${prodCount}`);
  console.log(`Separation: ${sepCount}`);
  console.log(`Review: ${revCount}`);
  
  if (diagnosticTable.length === 0) {
      console.log('RESULT: Screen is empty because there are no items in pending internal replenishment orders.');
  } else if (prodCount + sepCount + revCount === 0) {
      console.log('RESULT: Screen is empty because items in orders were not correctly categorized.');
  }

}

diagnosePlanning();
