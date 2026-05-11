require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runDiagnosis() {
  // 1. Get all produced purchase items
  const { data: purchaseItems } = await supabase
    .from('purchase_items')
    .select('id, name, item_type')
    .eq('item_type', 'produced');

  // 2. Get all count items (from items)
  const { data: countItems } = await supabase
    .from('items')
    .select('id, name');

  // 3. Get all existing links
  const { data: links } = await supabase
    .from('count_to_purchase_item_map')
    .select('purchase_item_id, count_item_id');

  const linkMap = new Map();
  links.forEach(l => linkMap.set(l.purchase_item_id, l.count_item_id));

  const normalize = (name) => {
      return name.toUpperCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[\.,\-\/]/g, ' ')
          .replace(/\b(DE|DO|DA|C|COM|UN|UNID|KG)\b/g, '')
          .replace(/\s+/g, ' ')
          .trim();
  };

  const normalizedCountItems = countItems.map(c => ({ ...c, norm: normalize(c.name) }));

  const results = [];

  for (const pi of purchaseItems) {
      const linkedCountId = linkMap.get(pi.id);
      let status = 'sem vínculo';
      let foundCountName = null;
      let foundCountId = null;

      if (linkedCountId) {
          status = 'vinculado';
          const cItem = countItems.find(c => c.id === linkedCountId);
          foundCountName = cItem ? cItem.name : 'ID não encontrado em items';
      } else {
          const normPi = normalize(pi.name);
          const matches = normalizedCountItems.filter(c => c.norm === normPi || c.name.toUpperCase() === pi.name.toUpperCase());
          if (matches.length === 1) {
              status = 'match automático possível';
              foundCountName = matches[0].name;
              foundCountId = matches[0].id;
          } else if (matches.length > 1) {
              status = 'ambíguo';
              foundCountName = matches.map(m => m.name).join(' | ');
          }
      }

      results.push({
          purchase_item_id: pi.id,
          purchase_item_name: pi.name,
          item_type: pi.item_type,
          count_item_id: linkedCountId || foundCountId,
          count_item_name: foundCountName,
          status
      });
  }

  console.table(results);
}

runDiagnosis();
