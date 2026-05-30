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

/**
 * Etapa 3: Buscar itens internos (ingredientes) para o dropdown de mapeamento
 */
export async function getAllItemsForMapping() {
    await requireManagerOrAdmin();
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from('items').select('id, name, unit').order('name');
    if (error) throw new Error(error.message);
    return data;
}

/**
 * Etapa 3: Atualiza a revisão de uma linha específica
 */
export async function updateInvoiceItemReview(
    itemId: string, 
    updateData: { matched_item_id: string | null, conversion_factor_snapshot: number | null, review_notes: string | null }
) {
    await requireManagerOrAdmin();
    const supabase = getSupabaseServerClient();

    const { error } = await supabase
        .from('supplier_invoice_items')
        .update({
            ...updateData,
            review_status: updateData.matched_item_id ? 'reviewed' : 'pending'
        })
        .eq('id', itemId);

    if (error) throw new Error("Erro ao salvar revisão: " + error.message);
    return { success: true };
}

/**
 * Etapa 3: Aprovar a nota inteira apos revisão das linhas
 */
export async function approveSupplierInvoice(invoiceId: string) {
    const userId = await requireManagerOrAdmin();
    const supabase = getSupabaseServerClient();

    // 1. Validar se existem linhas e se elas estão mapeadas (básico)
    const { data: items } = await supabase
        .from('supplier_invoice_items')
        .select('id, review_status')
        .eq('supplier_invoice_id', invoiceId);

    if (!items || items.length === 0) {
        throw new Error("Não é possível aprovar uma nota sem itens.");
    }

    const pendingItems = items.filter(i => i.review_status !== 'reviewed');
    if (pendingItems.length === items.length) {
        throw new Error("Nenhum item foi revisado. Vincule pelo menos um item da nota antes de aprovar.");
    }

    // 2. Atualizar nota
    const { error } = await supabase
        .from('supplier_invoices')
        .update({
            status: 'approved',
            approved_by: userId,
            approved_at: new Date().toISOString()
        })
        .eq('id', invoiceId);

    if (error) throw new Error("Erro ao aprovar nota: " + error.message);

    // 3. Log
    await supabase.from('invoice_import_logs').insert([{
        supplier_invoice_id: invoiceId,
        action: 'invoice_approved',
        performed_by: userId,
        payload_json: { approvedItemsCount: items.length - pendingItems.length }
    }]);

    return { success: true };
}

/**
 * Etapa 3: Excluir uma nota inteira
 */
export async function deleteSupplierInvoice(invoiceId: string) {
    const userId = await requireManagerOrAdmin();
    const supabase = getSupabaseServerClient();

    // 1. Log antes da exclusão (para manter registro do que será apagado)
    await supabase.from('invoice_import_logs').insert([{
        supplier_invoice_id: invoiceId,
        action: 'invoice_deleted',
        performed_by: userId
    }]);

    // 2. Excluir nota (cascade cuidará dos itens e logs)
    const { error } = await supabase
        .from('supplier_invoices')
        .delete()
        .eq('id', invoiceId);

    if (error) throw new Error("Erro ao excluir nota: " + error.message);
    return { success: true };
}

/**
 * Etapa 3: Excluir um item específico da nota
 */
export async function deleteSupplierInvoiceItem(itemId: string) {
    const userId = await requireManagerOrAdmin();
    const supabase = getSupabaseServerClient();

    // 1. Buscar a nota e contar itens restantes
    const { data: item } = await supabase
        .from('supplier_invoice_items')
        .select('supplier_invoice_id, item_description')
        .eq('id', itemId)
        .single();

    if (!item) throw new Error("Item não encontrado.");

    const { count } = await supabase
        .from('supplier_invoice_items')
        .select('*', { count: 'exact', head: true })
        .eq('supplier_invoice_id', item.supplier_invoice_id);

    if (count && count <= 1) {
        throw new Error("Não é possível excluir o último item da nota. Exclua a nota inteira se necessário.");
    }

    // 2. Log
    await supabase.from('invoice_import_logs').insert([{
        supplier_invoice_id: item.supplier_invoice_id,
        action: 'item_deleted',
        performed_by: userId,
        payload_json: { item_description: item.item_description }
    }]);

    // 3. Excluir item
    const { error } = await supabase
        .from('supplier_invoice_items')
        .delete()
        .eq('id', itemId);

    if (error) throw new Error("Erro ao excluir item: " + error.message);
    return { success: true };
}

/**
 * Etapa 4: Busca ciclos (execuções) ativos para seleção manual se necessário
 */
export async function getRecentActiveCycles() {
    await requireManagerOrAdmin();
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
        .from('routine_executions')
        .select(`
            id,
            started_at,
            routines ( name )
        `)
        .eq('status', 'active')
        .order('started_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
}

/**
 * Etapa 4: Processa uma nota aprovada, gerando entradas reais de estoque
 */
export async function processApprovedInvoice(invoiceId: string, manualCycleId?: string) {
    const userId = await requireManagerOrAdmin();
    const supabase = getSupabaseServerClient();

    // 1. Buscar nota e itens detalhados com classificação
    const { data: invoice, error: invErr } = await supabase
        .from('supplier_invoices')
        .select(`
            *,
            items:supplier_invoice_items (
                *,
                internal_product:matched_item_id (
                    id, name, cost_category, affects_cmv, affects_average_cost
                )
            )
        `)
        .eq('id', invoiceId)
        .single();

    if (invErr || !invoice) throw new Error("Nota não encontrada.");

    // 2. Validações de Status e Reprocessamento
    if (invoice.status !== 'approved') {
        throw new Error("Apenas notas aprovadas podem ser processadas.");
    }

    if (invoice.processed_at) {
        throw new Error("Esta nota já foi marcada como processada.");
    }

    // Validação extra: verificar via campo supplier_invoice_item_id se algum item da nota já gerou entrada
    const itemIds = invoice.items.map((i: any) => i.id);
    const { data: conflictingEntries } = await supabase
        .from('stock_entries')
        .select('id')
        .in('supplier_invoice_item_id', itemIds)
        .limit(1);

    if (conflictingEntries && conflictingEntries.length > 0) {
        throw new Error("Detectamos entradas de estoque já existentes vinculadas a itens desta nota. Processamento abortado por segurança.");
    }

    // 3. Definir Ciclo (execution_id)
    let targetCycleId = invoice.cycle_id || manualCycleId;

    if (!targetCycleId) {
        const activeCycles = await getRecentActiveCycles();
        if (activeCycles.length === 1) {
            targetCycleId = activeCycles[0].id;
        } else if (activeCycles.length === 0) {
            throw new Error("Nenhum ciclo de estoque ativo encontrado. Inicie um ciclo antes de processar a nota ou selecione manualmente.");
        } else {
            return { requiresSelection: true, activeCycles };
        }
    }

    // 4. Validar Classificação dos Itens
    const mappedItems = invoice.items.filter((i: any) => i.matched_item_id);
    const unclassified = mappedItems.filter((i: any) => !i.internal_product?.cost_category);
    
    if (unclassified.length > 0) {
        const names = unclassified.map((i: any) => i.internal_product?.name).join(', ');
        throw new Error(`Os seguintes itens mapeados não possuem classificação gerencial definida no cadastro: ${names}. Corrija no cadastro de itens antes de prosseguir.`);
    }

    // 5. Gerar Entradas de Estoque
    const itemsToProcess = mappedItems.filter((i: any) => i.review_status === 'reviewed');
    
    for (const item of itemsToProcess) {
        const convertedQty = item.converted_quantity || (item.purchase_quantity * (item.conversion_factor_snapshot || 1));
        const convertedCost = item.converted_unit_cost || (item.purchase_unit_cost / (item.conversion_factor_snapshot || 1));

        const { error: entryErr } = await supabase.from('stock_entries').insert([{
            execution_id: targetCycleId,
            item_id: item.matched_item_id,
            supplier_invoice_item_id: item.id,
            quantity_purchased: item.purchase_quantity,
            purchase_unit: item.purchase_unit,
            purchase_unit_price: item.purchase_unit_cost,
            conversion_factor_used: item.conversion_factor_snapshot,
            converted_quantity: convertedQty,
            converted_unit_cost: convertedCost,
            update_avg_cost: item.internal_product?.affects_average_cost || false,
            affects_avg_cost: item.internal_product?.affects_average_cost || false,
            notes: `Importação XML: Nota ${invoice.invoice_number}`,
            created_by: userId
        }]);

        if (entryErr) throw new Error(`Erro ao gerar entrada para o item ${item.item_description}: ${entryErr.message}`);

        // 6. Atualizar Custo Médio se necessário
        if (item.internal_product?.affects_average_cost) {
            await updateItemAverageCostHelper(item.matched_item_id, targetCycleId!);
        }
    }

    // 7. Finalizar Nota
    await supabase.from('supplier_invoices').update({
        processed_at: new Date().toISOString(),
        processed_by: userId,
        cycle_id: targetCycleId // Garante que a nota fica vinculada ao ciclo usado
    }).eq('id', invoiceId);

    // 8. Log
    await supabase.from('invoice_import_logs').insert([{
        supplier_invoice_id: invoiceId,
        action: 'invoice_processed',
        performed_by: userId,
        payload_json: { 
            itemsProcessed: itemsToProcess.length, 
            cycleId: targetCycleId 
        }
    }]);

    return { success: true };
}

/**
 * Helper para recalcular custo médio (reaproveitado de stockActions)
 */
async function updateItemAverageCostHelper(itemId: string, executionId: string) {
    const supabase = getSupabaseServerClient();
    
    // Buscar routine_id
    const { data: exec } = await supabase.from('routine_executions').select('routine_id').eq('id', executionId).single();
    if (!exec) return;

    // Snapshot base
    const { data: snapshot } = await supabase
        .from('routine_theoretical_snapshot')
        .select('theoretical_quantity, average_cost_snapshot')
        .eq('routine_id', exec.routine_id)
        .eq('item_id', itemId)
        .maybeSingle();

    const base_qty = snapshot?.theoretical_quantity || 0;
    const base_val = base_qty * (snapshot?.average_cost_snapshot || 0);

    // Entradas
    const { data: entries } = await supabase
        .from('stock_entries')
        .select('converted_quantity, converted_unit_cost')
        .eq('execution_id', executionId)
        .eq('item_id', itemId)
        .eq('affects_avg_cost', true);

    let compras_qty = 0;
    let compras_val = 0;
    if (entries) {
        for (const entry of entries) {
            compras_qty += Number(entry.converted_quantity || 0);
            compras_val += Number(entry.converted_quantity || 0) * Number(entry.converted_unit_cost || 0);
        }
    }

    const total_qty = base_qty + compras_qty;
    const total_val = base_val + compras_val;

    if (total_qty > 0) {
        const new_avg = total_val / total_qty;
        await supabase.from('items').update({ average_cost: new_avg }).eq('id', itemId);
    }
}

