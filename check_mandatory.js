const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMandatoryItems() {
  const mandatory = [
    'Espeto Frango', 'Espeto Baby Beef', 'Espeto Coração', 
    'Feijão Cozido', 'Farofa', 'Molho Gorgonzola', 
    'Pote 145ML', 'Embalagem de Isopor', 'Assa Rápido'
  ];

  console.log('--- CHECKING MANDATORY ITEMS MAPPINGS AND COUNTS ---\n');

  const { data: items } = await supabase
    .from('purchase_items')
    .select('id, name, item_type')
    .or(mandatory.map(m => `name.ilike.%${m}%`).join(','));

  const itemIds = items.map(i => i.id);

  const { data: mappings } = await supabase
    .from('count_to_purchase_item_map')
    .select('purchase_item_id, count_item_id')
    .in('purchase_item_id', itemIds);

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

  const results = items.map(i => {
      const cId = map.get(i.id);
      const c = cId ? lastCountMap.get(cId) : null;
      return {
          name: i.name,
          type: i.item_type,
          mapped: !!cId,
          last_count_qty: c ? (c.validated_quantity ?? c.counted_quantity) : '-',
          last_count_date: c ? new Date(c.count_sessions.completed_at).toLocaleDateString() : '-',
          last_count_group: c ? c.count_sessions.groups.name : '-'
      };
  });

  console.table(results);
}

checkMandatoryItems();
