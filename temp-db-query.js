require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function run() {
  // Select user
  const { data, error } = await supabase
    .from('users')
    .select('id, name, role, unit_id, primary_group_id, active')
    .ilike('name', '%cozinha%')
  
  console.log('User before:', data)
  
  if (data && data.length > 0) {
    const user = data[0]
    if (user.role !== 'kitchen') {
      const { data: updated, error: updateError } = await supabase
        .from('users')
        .update({ role: 'kitchen' })
        .eq('id', user.id)
        .select()
      console.log('Updated:', updated)
      console.log('Update error:', updateError)
    }
  }

  // Also query purchase_orders
  const { data: orders, error: ordersError } = await supabase
    .from('purchase_orders')
    .select('id, status, store_id, created_by, sent_at, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  console.log('Orders:', orders)
}

run()
