'use server'

import { createClient } from '@supabase/supabase-js'
import { requireManagerOrAdmin } from '@/lib/auth-utils'

function getSupabaseServerClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

/**
 * Busca lista de notas importadas
 */
export async function getSupplierInvoices(filters?: { status?: string }) {
    await requireManagerOrAdmin()

    const supabase = getSupabaseServerClient()
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

    const supabase = getSupabaseServerClient()
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

    const supabase = getSupabaseServerClient()
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

import { parseInvoiceXml } from '@/modules/invoice-import/parser'
import { ParsedInvoiceResult } from '@/modules/invoice-import/types'

/**
 * Etapa 2: Ler arquivo do Frontend, fazer parse e retornar prévia
 */
export async function previewInvoiceXml(formData: FormData) {
    await requireManagerOrAdmin();
    
    const file = formData.get('file') as File;
    if (!file) throw new Error("Nenhum arquivo enviado.");
    
    const text = await file.text();
    const result = parseInvoiceXml(text);
    
    if (!result.success) {
        throw new Error(result.error);
    }
    
    // Validar duplicidade
    const supabase = getSupabaseServerClient();
    const { data: existing } = await supabase
        .from('supplier_invoices')
        .select('id')
        .eq('invoice_key', result.header?.invoice_key)
        .single();
        
    if (existing) {
        throw new Error(`Esta nota já foi importada anteriormente (Chave: ${result.header?.invoice_key}).`);
    }
    
    return result;
}

/**
 * Etapa 2: Confirmar importação e salvar no banco
 */
export async function confirmImportInvoice(parsedData: ParsedInvoiceResult) {
    const userId = await requireManagerOrAdmin();
    const supabase = getSupabaseServerClient();
    
    if (!parsedData.header || !parsedData.items) {
        throw new Error("Dados da nota inválidos.");
    }

    // 1. Inserir cabeçalho
    const { data: invoice, error: headerErr } = await supabase
        .from('supplier_invoices')
        .insert([{
            ...parsedData.header,
            imported_by: userId,
            status: 'pending'
        }])
        .select('id')
        .single();

    if (headerErr) {
        throw new Error("Erro ao salvar nota: " + headerErr.message);
    }

    // 2. Inserir itens
    const itemsToInsert = parsedData.items.map(item => ({
        ...item,
        supplier_invoice_id: invoice.id,
        review_status: 'pending'
    }));

    const { error: itemsErr } = await supabase
        .from('supplier_invoice_items')
        .insert(itemsToInsert);

    if (itemsErr) {
        // Fallback: logar o erro, embora a integridade referencial não faça rollback no REST. O usuário poderá apagar a nota depois.
        console.error("Erro ao inserir itens da nota:", itemsErr.message);
    }

    // 3. Log
    await supabase.from('invoice_import_logs').insert([{
        supplier_invoice_id: invoice.id,
        action: 'import_completed',
        performed_by: userId,
        payload_json: { header: parsedData.header, itemsCount: parsedData.items.length }
    }]);

    return { success: true, id: invoice.id };
}
