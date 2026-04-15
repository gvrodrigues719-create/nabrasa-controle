-- Etapa 1: Estrutura Base para Importação de Notas Fiscais (XML)
-- Módulo NaBrasa Controle

-- 1. Cabeçalho das Notas (supplier_invoices)
CREATE TABLE IF NOT EXISTS public.supplier_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id UUID REFERENCES public.routine_executions(id) ON DELETE SET NULL,
    
    supplier_name TEXT NOT NULL,
    supplier_document TEXT NOT NULL, -- CNPJ
    
    invoice_key TEXT UNIQUE NOT NULL, -- Chave de acesso 44 dígitos
    invoice_number TEXT NOT NULL,
    invoice_series TEXT,
    issued_at TIMESTAMPTZ,
    
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    
    xml_file_url TEXT, -- Placeholder para Etapa 2
    
    imported_by UUID REFERENCES public.users(id),
    approved_by UUID REFERENCES public.users(id),
    
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Itens das Notas (supplier_invoice_items)
CREATE TABLE IF NOT EXISTS public.supplier_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_invoice_id UUID NOT NULL REFERENCES public.supplier_invoices(id) ON DELETE CASCADE,
    
    line_number INT,
    supplier_item_code TEXT NOT NULL,
    ean TEXT,
    item_description TEXT NOT NULL,
    
    purchase_unit TEXT NOT NULL,
    purchase_quantity NUMERIC(15, 4) NOT NULL DEFAULT 0,
    purchase_unit_cost NUMERIC(15, 4) NOT NULL DEFAULT 0,
    purchase_total_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
    
    -- Mapeamento interno
    matched_item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
    
    -- Snapshot dos dados de conversão no momento do matching
    conversion_factor_snapshot NUMERIC(15, 6),
    converted_quantity NUMERIC(15, 4),
    converted_unit_cost NUMERIC(15, 4),
    
    review_status TEXT NOT NULL DEFAULT 'pending', -- pending, reviewed
    review_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Memória de Mapeamento (supplier_item_mappings)
CREATE TABLE IF NOT EXISTS public.supplier_item_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_document TEXT NOT NULL,
    supplier_item_code TEXT NOT NULL,
    
    internal_item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    
    -- Cache do último fator de conversão usado para este fornecedor/item
    conversion_factor NUMERIC(15, 6) DEFAULT 1,
    
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(supplier_document, supplier_item_code)
);

-- 4. Log de Importação (invoice_import_logs)
CREATE TABLE IF NOT EXISTS public.invoice_import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_invoice_id UUID REFERENCES public.supplier_invoices(id) ON DELETE CASCADE,
    
    action TEXT NOT NULL,
    payload_json JSONB,
    performed_by UUID REFERENCES public.users(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Básico (seguindo padrão do projeto)
ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_item_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_import_logs ENABLE ROW LEVEL SECURITY;

-- Políticas simples para Admin/Manager
CREATE POLICY "Admin/Manager full access on supplier_invoices" ON public.supplier_invoices 
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager')));

CREATE POLICY "Admin/Manager full access on supplier_invoice_items" ON public.supplier_invoice_items 
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager')));

CREATE POLICY "Admin/Manager full access on supplier_item_mappings" ON public.supplier_item_mappings 
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager')));

CREATE POLICY "Admin/Manager full access on invoice_import_logs" ON public.invoice_import_logs 
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager')));
