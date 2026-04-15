'use server'

import { createClient } from '@supabase/supabase-js'
import { requireManagerOrAdmin } from '@/lib/auth-utils'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Busca lista de notas importadas
 */
export async function getSupplierInvoices(filters?: { status?: string }) {
    await requireManagerOrAdmin()

    let query = supabase
        .from('supplier_invoices')
        .select(`
            *,
            users:imported_by ( name )
        `)
        .order('created_at', { ascending: false })

    if (filters?.status) {
        query = query.eq('status', filters.status)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return { success: true, data }
}

/**
 * Busca detalhes de uma nota específica e seus itens
 */
export async function getSupplierInvoiceDetail(invoiceId: string) {
    await requireManagerOrAdmin()

    const { data: invoice, error: invErr } = await supabase
        .from('supplier_invoices')
        .select('*')
        .eq('id', invoiceId)
        .single()

    if (invErr) throw new Error(invErr.message)

    const { data: items, error: itemsErr } = await supabase
        .from('supplier_invoice_items')
        .select(`
            *,
            internal_item:matched_item_id ( name, unit )
        `)
        .eq('supplier_invoice_id', invoiceId)
        .order('line_number', { ascending: true })

    if (itemsErr) throw new Error(itemsErr.message)

    return { 
        success: true, 
        data: { 
            ...invoice, 
            items 
        } 
    }
}

/**
 * Placeholder para registro inicial de nota (Etapa 1)
 */
export async function registerInitialInvoiceHeader(data: {
    supplier_name: string,
    supplier_document: string,
    invoice_key: string,
    invoice_number: string,
    total_amount: number
}) {
    const userId = await requireManagerOrAdmin()

    const { data: newInvoice, error } = await supabase
        .from('supplier_invoices')
        .insert([{
            ...data,
            imported_by: userId,
            status: 'pending'
        }])
        .select('id')
        .single()

    if (error) throw new Error(error.message)

    // Log de auditoria
    await supabase.from('invoice_import_logs').insert([{
        supplier_invoice_id: newInvoice.id,
        action: 'import_started',
        performed_by: userId,
        payload_json: data
    }])

    return { success: true, id: newInvoice.id }
}
