require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runDiagnosis() {
  const { data: links, error } = await supabase
    .from('count_to_purchase_item_map')
    .select(`
        purchase_item_id,
        count_item_id,
        purchase_items!inner(name, item_type),
        items!inner(name, groups(name, macro_sector))
    `);

  if (error) {
      console.error(error);
      return;
  }

  // Fetch last session for each count_item
  const countItemIds = links.map(l => l.count_item_id);
  const { data: sessions } = await supabase
    .from('count_session_items')
    .select(`
        item_id,
        count_sessions!inner(status, completed_at, groups!inner(name, macro_sector))
    `)
    .in('item_id', countItemIds)
    .eq('count_sessions.status', 'completed');

  const sessionMap = new Map();
  if (sessions) {
      sessions.sort((a, b) => new Date(b.count_sessions.completed_at).getTime() - new Date(a.count_sessions.completed_at).getTime());
      for (const s of sessions) {
          if (!sessionMap.has(s.item_id)) {
              sessionMap.set(s.item_id, s.count_sessions);
          }
      }
  }

  const results = links.map(l => {
      const sess = sessionMap.get(l.count_item_id) || {};
      const sessGroup = sess.groups || {};
      
      return {
          purchase_item_name: l.purchase_items.name,
          count_item_name: l.items.name,
          count_item_group: l.items.groups?.name,
          count_item_macro_sector: l.items.groups?.macro_sector,
          session_group: sessGroup.name,
          session_macro_sector: sessGroup.macro_sector,
          completed_at: sess.completed_at
      };
  });

  console.table(results);
}

runDiagnosis();
