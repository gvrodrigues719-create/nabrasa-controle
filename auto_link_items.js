require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function autoLink() {
  const { data: purchaseItems } = await supabase
    .from('purchase_items')
    .select('id, name')
    .eq('item_type', 'produced');

  const { data: countItems } = await supabase
    .from('items')
    .select('id, name');

  const { data: links } = await supabase
    .from('count_to_purchase_item_map')
    .select('purchase_item_id, count_item_id');

  const linkMap = new Set(links.map(l => l.purchase_item_id));

  const normalize = (name) => {
      return name.toUpperCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[\.,\-\/]/g, ' ')
          .replace(/\b(DE|DO|DA|C|COM|UN|UNID|KG)\b/g, '')
          .replace(/\s+/g, ' ')
          .trim();
  };

  const normalizedCountItems = countItems.map(c => ({ ...c, norm: normalize(c.name) }));

  let insertedCount = 0;

  for (const pi of purchaseItems) {
      if (linkMap.has(pi.id)) continue; // Already linked

      const normPi = normalize(pi.name);
      const matches = normalizedCountItems.filter(c => c.norm === normPi || c.name.toUpperCase() === pi.name.toUpperCase());
      
      if (matches.length === 1) {
          const match = matches[0];
          console.log(`Linking: "${pi.name}" -> "${match.name}"`);
          const { error } = await supabase
              .from('count_to_purchase_item_map')
              .insert({
                  purchase_item_id: pi.id,
                  count_item_id: match.id
              });
          
          if (error) {
              console.error(`Error linking ${pi.name}:`, error.message);
          } else {
              insertedCount++;
          }
      }
  }

  console.log(`Auto-link finished. Inserted ${insertedCount} new links.`);
}

autoLink();
