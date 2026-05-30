import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getAdminSupabase } from "@/lib/supabase/admin";

async function checkGroups() {
    const supabase = getAdminSupabase();
    
    const { data: gs } = await supabase.from('groups').select('id, name').eq('routine_id', '71bee6e1-5869-413f-9b23-be3d6fdb2e9d');
    console.table(gs);
}
checkGroups();
