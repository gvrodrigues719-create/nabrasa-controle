import { getAdminSupabase } from '@/lib/supabase/admin'

async function testFetch() {
    const supabase = getAdminSupabase()
    const { data: countData, error } = await supabase
        .from('count_session_items')
        .select(`
            item_id, counted_quantity, is_zeroed, validated_quantity, validated_is_zeroed,
            count_sessions!inner(completed_at, status)
        `)
        .eq('count_sessions.status', 'completed')
        .limit(10)
    
    console.log(error || countData)
}

testFetch()
