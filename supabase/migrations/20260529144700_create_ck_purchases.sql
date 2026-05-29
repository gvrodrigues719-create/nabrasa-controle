-- Migration: Create CK Purchase Catalog & Suppliers

-- 1. Create Suppliers Table
CREATE TABLE IF NOT EXISTS public.ck_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    category_main TEXT,
    notes TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Purchase Catalog Items Table
CREATE TABLE IF NOT EXISTS public.ck_purchase_catalog_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES public.ck_suppliers(id),
    fiscal_item_name TEXT NOT NULL,
    normalized_item_name TEXT NOT NULL,
    category TEXT,
    subcategory TEXT,
    unit TEXT,
    last_unit_price NUMERIC(12,4),
    last_total_price NUMERIC(12,2),
    last_nf TEXT,
    last_purchase_date DATE,
    status TEXT,
    observation TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(supplier_id, normalized_item_name, unit)
);

-- 3. Create Purchase Price History Table
CREATE TABLE IF NOT EXISTS public.ck_purchase_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_item_id UUID REFERENCES public.ck_purchase_catalog_items(id),
    supplier_id UUID REFERENCES public.ck_suppliers(id),
    nf TEXT,
    purchase_date DATE,
    quantity NUMERIC(12,3),
    unit TEXT,
    unit_price NUMERIC(12,4),
    total_price NUMERIC(12,2),
    invoice_total NUMERIC(12,2),
    status TEXT,
    observation TEXT,
    source_file TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Alter existing receiving tables
ALTER TABLE public.ck_receivings ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.ck_suppliers(id);

ALTER TABLE public.ck_receiving_items ADD COLUMN IF NOT EXISTS catalog_item_id UUID REFERENCES public.ck_purchase_catalog_items(id);
ALTER TABLE public.ck_receiving_items ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.ck_suppliers(id);
ALTER TABLE public.ck_receiving_items ADD COLUMN IF NOT EXISTS expected_unit_price NUMERIC(12,4);
ALTER TABLE public.ck_receiving_items ADD COLUMN IF NOT EXISTS expected_total NUMERIC(12,2);
ALTER TABLE public.ck_receiving_items ADD COLUMN IF NOT EXISTS item_name_snapshot TEXT;
ALTER TABLE public.ck_receiving_items ADD COLUMN IF NOT EXISTS unit_snapshot TEXT;

-- 5. RLS Policies
ALTER TABLE public.ck_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ck_purchase_catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ck_purchase_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for admin and kitchen" ON public.ck_suppliers
    FOR SELECT USING (auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'kitchen')));

CREATE POLICY "Allow write for admin and kitchen" ON public.ck_suppliers
    FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'kitchen')))
    WITH CHECK (auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'kitchen')));

CREATE POLICY "Allow read for admin and kitchen" ON public.ck_purchase_catalog_items
    FOR SELECT USING (auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'kitchen')));

CREATE POLICY "Allow write for admin and kitchen" ON public.ck_purchase_catalog_items
    FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'kitchen')))
    WITH CHECK (auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'kitchen')));

CREATE POLICY "Allow read for admin and kitchen" ON public.ck_purchase_price_history
    FOR SELECT USING (auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'kitchen')));

CREATE POLICY "Allow write for admin and kitchen" ON public.ck_purchase_price_history
    FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'kitchen')))
    WITH CHECK (auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'kitchen')));
