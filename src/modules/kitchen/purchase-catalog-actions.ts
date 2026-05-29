'use server'

import { getAdminSupabase } from '@/lib/supabase/admin'
import { getServerAuthContext } from '@/lib/server-auth-context'

async function getCurrentUser() {
    const supabase = getAdminSupabase()
    const user = await getServerAuthContext()
    const isKitchen = user.role === 'admin' || user.role === 'kitchen' || user.groups?.macro_sector === 'Cozinha Central'
    if (!isKitchen) throw new Error('Acesso Bloqueado. Apenas admin ou cozinha central.')
    return { supabase, user }
}

export async function getCkSuppliersAction() {
    try {
        const { supabase } = await getCurrentUser()
        const { data, error } = await supabase
            .from('ck_suppliers')
            .select('*')
            .eq('active', true)
            .order('name')
            
        if (error) throw error
        return { data }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function getCkPurchaseCatalogItemsAction(supplierId?: string) {
    try {
        const { supabase } = await getCurrentUser()
        let query = supabase
            .from('ck_purchase_catalog_items')
            .select(`
                *,
                ck_suppliers:supplier_id (
                    id, name
                )
            `)
            .eq('active', true)
            .order('fiscal_item_name')
            
        if (supplierId) {
            query = query.eq('supplier_id', supplierId)
        }
            
        const { data, error } = await query
        if (error) throw error
        return { data }
    } catch (e: any) {
        return { error: e.message }
    }
}
