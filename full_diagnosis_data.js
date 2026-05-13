const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fullItemDiagnosis() {
  const { data: orderItems } = await supabase
    .from('purchase_order_items')
    .select('order_id, item_id, requested_qty, purchase_items(id, name, item_type)')
    .in('order_id', ['9d391216-407c-4119-8639-c377aaa9d591', 'c7a19e65-09f3-4913-994c-0b96104ce917']);

  const allItemIds = orderItems.map(i => i.item_id);

  const { data: mappings } = await supabase
    .from('count_to_purchase_item_map')
    .select('purchase_item_id, count_item_id')
    .in('purchase_item_id', allItemIds);

  const map = new Map();
  mappings?.forEach(m => map.set(m.purchase_item_id, m.count_item_id));

  const countItemIds = Array.from(new Set(mappings?.map(m => m.count_item_id) || []));

  const { data: countData } = await supabase
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

  const lastCountMap = new Map();
  if (countData) {
      countData.sort((a, b) => new Date(b.count_sessions.completed_at) - new Date(a.count_sessions.completed_at));
      countData.forEach(c => {
          if (!lastCountMap.has(c.item_id)) {
              lastCountMap.set(c.item_id, c);
          }
      });
  }

  const results = orderItems.map(si => {
      const item = si.purchase_items;
      const cId = map.get(item.id);
      const c = cId ? lastCountMap.get(cId) : null;
      
      let expected_cat = 'review';
      if (item.item_type === 'produced' && cId && c) expected_cat = 'production';
      else if (item.item_type === 'separated') expected_cat = 'separation';

      return {
          purchase_item_id: item.id.substring(0, 8),
          nome: item.name,
          requested: si.requested_qty,
          type: item.item_type,
          expected_cat,
          has_map: !!cId,
          last_qty: c ? (c.validated_quantity ?? c.counted_quantity) : '-',
          last_date: c ? new Date(c.count_sessions.completed_at).toLocaleDateString() : '-',
          motivo_oculto: 'Status do pedido é em_analise (sistema exige enviado ou em_separacao)'
      };
  });

  console.log(JSON.stringify(results));
}

fullItemDiagnosis();
