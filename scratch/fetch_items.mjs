import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fetchItems() {
  const { data, error } = await supabase
    .from('items')
    .select('id, name, average_cost, cost_category, affects_cmv, affects_average_cost')
  
  if (error) {
    console.error('Error fetching items:', error)
    return
  }

  fs.writeFileSync('scratch/db_items.json', JSON.stringify(data, null, 2))
  console.log(`Fetched ${data.length} items.`)
}

fetchItems()
