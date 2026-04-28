-- ============================================================
-- SQL CONSOLIDADO V3 FINAL (CORRIGIDO V2) — Prontidão Total
-- Objetivo: Criar Tabelas, Garantir Esquema e Blindar Segurança
-- ============================================================

-- 1. CRIAÇÃO DE TABELAS (SE NÃO EXISTIREM)
CREATE TABLE IF NOT EXISTS public.purchase_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    category text NOT NULL,
    order_unit text NOT NULL DEFAULT 'un',
    count_unit text NOT NULL DEFAULT 'un',
    allows_decimal boolean NOT NULL DEFAULT false,
    min_stock numeric(10, 3),
    max_stock numeric(10, 3),
    origin text NOT NULL DEFAULT 'cozinha_central',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL REFERENCES public.groups(id),
    order_type text DEFAULT 'internal_replenishment' CHECK (order_type IN ('supplier_purchase', 'internal_replenishment')),
    source_location_id uuid REFERENCES public.groups(id),
    destination_location_id uuid REFERENCES public.groups(id),
    created_by uuid NOT NULL REFERENCES public.users(id),
    requested_by uuid REFERENCES public.users(id),
    approved_by uuid REFERENCES public.users(id),
    status text NOT NULL DEFAULT 'rascunho',
    requested_for_date timestamptz,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    item_id uuid NOT NULL REFERENCES public.purchase_items(id),
    requested_qty numeric(10, 3) NOT NULL,
    separated_qty numeric(10, 3),
    received_qty numeric(10, 3),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recipes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES public.purchase_items(id) ON DELETE CASCADE,
    ingredient_id uuid NOT NULL REFERENCES public.purchase_items(id) ON DELETE CASCADE,
    quantity numeric(10, 4) NOT NULL,
    unit text NOT NULL,
    yield_percentage numeric(5, 2) DEFAULT 100.0,
    ingredient_stock_type text DEFAULT 'raw' CHECK (ingredient_stock_type IN ('raw', 'semi_finished', 'finished')),
    created_at timestamptz DEFAULT now(),
    UNIQUE(product_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS public.inventory_balances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id uuid NOT NULL REFERENCES public.purchase_items(id) ON DELETE CASCADE,
    location_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    quantity numeric(10, 3) NOT NULL DEFAULT 0,
    reserved_qty numeric(10, 3) NOT NULL DEFAULT 0,
    type text NOT NULL CHECK (type IN ('raw', 'semi_finished', 'finished')),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(item_id, location_id, type)
);

CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id uuid NOT NULL REFERENCES public.purchase_items(id),
    location_id uuid NOT NULL REFERENCES public.groups(id),
    type text NOT NULL,
    quantity numeric(10, 3) NOT NULL,
    reference_type text,
    reference_id uuid,
    notes text,
    created_by uuid REFERENCES public.users(id),
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.central_kitchen_production_suggestions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    item_id uuid NOT NULL REFERENCES public.purchase_items(id) ON DELETE CASCADE,
    source_location_id uuid REFERENCES public.groups(id),
    destination_location_id uuid REFERENCES public.groups(id),
    requested_qty numeric(10, 3) NOT NULL,
    ready_stock_qty numeric(10, 3) NOT NULL DEFAULT 0,
    scheduled_qty numeric(10, 3) NOT NULL DEFAULT 0,
    suggested_qty numeric(10, 3) NOT NULL,
    approved_qty numeric(10, 3),
    adjustment_reason text,
    adjustment_notes text,
    adjusted_by uuid REFERENCES public.users(id),
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'dismissed')),
    calculated_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.production_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'canceled')),
    location_id uuid NOT NULL REFERENCES public.groups(id),
    notes text,
    created_by uuid NOT NULL REFERENCES public.users(id),
    approved_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.production_order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    production_order_id uuid NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
    item_id uuid NOT NULL REFERENCES public.purchase_items(id),
    source_suggestion_id uuid,
    planned_qty numeric(10, 3) NOT NULL,
    approved_qty numeric(10, 3) NOT NULL,
    produced_qty numeric(10, 3) DEFAULT 0,
    lost_qty numeric(10, 3) DEFAULT 0,
    unit text,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'produced', 'rejected')),
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.operational_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type text NOT NULL DEFAULT 'production',
    title text NOT NULL,
    description text,
    area_group_id uuid REFERENCES public.groups(id),
    responsible_id uuid REFERENCES public.users(id),
    status text NOT NULL DEFAULT 'pending',
    conclusion_criteria text,
    production_order_id uuid REFERENCES public.production_orders(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.production_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    production_order_id uuid REFERENCES public.production_orders(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.users(id),
    event_type text NOT NULL,
    payload jsonb,
    created_at timestamptz DEFAULT now()
);

-- 2. GARANTIR COLUNAS E CONSTRAINTS (IDEMPOTENTE)
DO $$ 
BEGIN
    ALTER TABLE public.recipes DROP CONSTRAINT IF EXISTS recipes_yield_positive;
    ALTER TABLE public.recipes ADD CONSTRAINT recipes_yield_positive CHECK (yield_percentage > 0);

    UPDATE public.groups SET type = 'unit' WHERE type IS NULL;
    UPDATE public.groups SET type = 'stock_location' WHERE (name ILIKE '%Cozinha%' OR name ILIKE '%Almoxarifado%') AND type = 'unit';
END $$;

-- 3. HABILITAR RLS
ALTER TABLE public.recipes                               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_balances                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.central_kitchen_production_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_orders                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_order_items               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_tasks                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_events                     ENABLE ROW LEVEL SECURITY;

-- 4. FUNÇÕES TRANSACIONAIS (SECURITY DEFINER)

-- 4.1 APROVAR PRODUÇÃO
CREATE OR REPLACE FUNCTION public.approve_production_plan(
    p_location_id UUID,
    p_notes TEXT,
    p_items JSONB
) RETURNS UUID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_role TEXT;
    v_user_unit UUID;
    v_order_id UUID;
    v_item RECORD;
    v_recipe RECORD;
    v_need NUMERIC;
    v_available NUMERIC;
    v_item_unit TEXT;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
    IF jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Lista de itens vazia'; END IF;
    IF EXISTS (SELECT 1 FROM (SELECT jsonb_array_elements(p_items)->>'item_id' as id) t GROUP BY id HAVING count(*) > 1) THEN
        RAISE EXCEPTION 'Itens duplicados na lista de aprovação';
    END IF;

    SELECT role, primary_group_id INTO v_user_role, v_user_unit FROM public.users WHERE id = v_user_id;
    IF v_user_role NOT IN ('admin', 'manager', 'kitchen') THEN RAISE EXCEPTION 'Sem permissão'; END IF;
    IF v_user_role = 'manager' AND v_user_unit != p_location_id THEN RAISE EXCEPTION 'Acesso negado a esta unidade'; END IF;

    INSERT INTO public.production_orders (location_id, created_by, status, notes)
    VALUES (p_location_id, v_user_id, 'pending', p_notes)
    RETURNING id INTO v_order_id;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, quantity NUMERIC, suggested_qty NUMERIC, reason TEXT, notes TEXT, source_suggestion_id UUID)
    LOOP
        IF v_item.quantity <= 0 THEN RAISE EXCEPTION 'Quantidade aprovada deve ser positiva'; END IF;
        SELECT order_unit INTO v_item_unit FROM public.purchase_items WHERE id = v_item.item_id;
        INSERT INTO public.production_order_items (production_order_id, item_id, planned_qty, approved_qty, unit, status, source_suggestion_id)
        VALUES (v_order_id, v_item.item_id, v_item.suggested_qty, v_item.quantity, COALESCE(v_item_unit, 'un'), 'pending', v_item.source_suggestion_id);

        IF v_item.source_suggestion_id IS NOT NULL THEN
            UPDATE public.central_kitchen_production_suggestions
            SET status = 'approved', approved_qty = v_item.quantity, adjusted_by = v_user_id, updated_at = NOW()
            WHERE id = v_item.source_suggestion_id;
        END IF;

        FOR v_recipe IN SELECT * FROM public.recipes WHERE product_id = v_item.item_id
        LOOP
            v_need := (v_item.quantity * v_recipe.quantity) / (v_recipe.yield_percentage / 100.0);
            SELECT (COALESCE(quantity,0) - COALESCE(reserved_qty,0)) INTO v_available FROM public.inventory_balances
            WHERE item_id = v_recipe.ingredient_id AND location_id = p_location_id AND type = v_recipe.ingredient_stock_type FOR UPDATE;

            IF v_available IS NULL OR v_available < v_need THEN
                RAISE EXCEPTION 'Estoque insuficiente para o insumo % (Disponível: %, Necessário: %)', 
                    (SELECT name FROM public.purchase_items WHERE id = v_recipe.ingredient_id), COALESCE(v_available, 0), v_need;
            END IF;

            UPDATE public.inventory_balances SET reserved_qty = reserved_qty + v_need, updated_at = NOW()
            WHERE item_id = v_recipe.ingredient_id AND location_id = p_location_id AND type = v_recipe.ingredient_stock_type;
        END LOOP;
    END LOOP;

    INSERT INTO public.production_events (production_order_id, user_id, event_type, payload)
    VALUES (v_order_id, v_user_id, 'production_plan_approved', p_items);

    INSERT INTO public.operational_tasks (type, title, description, area_group_id, status, production_order_id, conclusion_criteria)
    VALUES ('production', 'Produção — Ordem #' || substring(v_order_id::text, 1, 8), 'Executar produção.', p_location_id, 'pending', v_order_id, 'Quantidade produzida e perdas registradas.');

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.2 CANCELAR PRODUÇÃO
CREATE OR REPLACE FUNCTION public.cancel_production_order(p_order_id UUID) RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_role TEXT;
    v_user_unit UUID;
    v_order_loc UUID;
    v_order_status TEXT;
    v_item RECORD;
    v_recipe RECORD;
    v_unreserve NUMERIC;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
    
    SELECT po.location_id, po.status, u.role, u.primary_group_id 
    INTO v_order_loc, v_order_status, v_user_role, v_user_unit 
    FROM public.production_orders po JOIN public.users u ON u.id = v_user_id WHERE po.id = p_order_id;
    
    IF v_order_status IN ('completed', 'canceled') THEN RAISE EXCEPTION 'Ordem já finalizada ou cancelada'; END IF;
    IF v_user_role NOT IN ('admin', 'kitchen') AND (v_user_unit != v_order_loc) THEN RAISE EXCEPTION 'Sem permissão'; END IF;

    FOR v_item IN SELECT * FROM public.production_order_items WHERE production_order_id = p_order_id
    LOOP
        FOR v_recipe IN SELECT * FROM public.recipes WHERE product_id = v_item.item_id
        LOOP
            v_unreserve := (v_item.approved_qty * v_recipe.quantity) / (v_recipe.yield_percentage / 100.0);
            UPDATE public.inventory_balances SET reserved_qty = GREATEST(0, reserved_qty - v_unreserve), updated_at = NOW()
            WHERE item_id = v_recipe.ingredient_id AND location_id = v_order_loc AND type = v_recipe.ingredient_stock_type;
        END LOOP;
    END LOOP;
    UPDATE public.production_orders SET status = 'canceled', updated_at = NOW() WHERE id = p_order_id;
    UPDATE public.operational_tasks SET status = 'canceled', updated_at = NOW() WHERE production_order_id = p_order_id;
    INSERT INTO public.production_events (production_order_id, user_id, event_type, payload) VALUES (p_order_id, v_user_id, 'order_canceled', '{}');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.3 FINALIZAR PRODUÇÃO
CREATE OR REPLACE FUNCTION public.complete_production_order(
    p_order_id UUID,
    p_items JSONB
) RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_role TEXT;
    v_user_unit UUID;
    v_loc_id UUID;
    v_status TEXT;
    v_item RECORD;
    v_recipe RECORD;
    v_consumed NUMERIC;
    v_originally_reserved NUMERIC;
    v_unreserve NUMERIC;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
    IF jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Lista de itens vazia'; END IF;

    SELECT role, primary_group_id INTO v_user_role, v_user_unit FROM public.users WHERE id = v_user_id;
    SELECT location_id, status INTO v_loc_id, v_status FROM public.production_orders WHERE id = p_order_id;
    IF v_status IN ('completed', 'canceled') THEN RAISE EXCEPTION 'Ordem já finalizada ou cancelada'; END IF;
    IF v_user_role NOT IN ('admin', 'kitchen') AND (v_user_unit != v_loc_id) THEN RAISE EXCEPTION 'Sem permissão'; END IF;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, produced_qty NUMERIC, lost_qty NUMERIC)
    LOOP
        SELECT approved_qty INTO v_originally_reserved FROM public.production_order_items WHERE production_order_id = p_order_id AND item_id = v_item.item_id;
        IF v_originally_reserved IS NULL THEN RAISE EXCEPTION 'Item não pertence a esta ordem'; END IF;

        FOR v_recipe IN SELECT * FROM public.recipes WHERE product_id = v_item.item_id
        LOOP
            v_consumed := (v_item.produced_qty + v_item.lost_qty) * v_recipe.quantity / (v_recipe.yield_percentage / 100.0);
            v_unreserve := (v_originally_reserved * v_recipe.quantity) / (v_recipe.yield_percentage / 100.0);
            
            UPDATE public.inventory_balances SET quantity = quantity - v_consumed, reserved_qty = GREATEST(0, reserved_qty - v_unreserve), updated_at = NOW()
            WHERE item_id = v_recipe.ingredient_id AND location_id = v_loc_id AND type = v_recipe.ingredient_stock_type;

            INSERT INTO public.inventory_movements (item_id, location_id, type, quantity, reference_id, created_by)
            VALUES (v_recipe.ingredient_id, v_loc_id, 'production_consumed_raw', -v_consumed, p_order_id, v_user_id);
        END LOOP;

        UPDATE public.inventory_balances SET quantity = quantity + v_item.produced_qty, updated_at = NOW() WHERE item_id = v_item.item_id AND location_id = v_loc_id AND type = 'finished';
        IF NOT FOUND THEN INSERT INTO public.inventory_balances (item_id, location_id, type, quantity) VALUES (v_item.item_id, v_loc_id, 'finished', v_item.produced_qty); END IF;

        UPDATE public.production_order_items SET produced_qty = v_item.produced_qty, lost_qty = v_item.lost_qty, status = 'produced'
        WHERE production_order_id = p_order_id AND item_id = v_item.item_id;
    END LOOP;

    UPDATE public.production_orders SET status = 'completed', completed_at = NOW() WHERE id = p_order_id;
    UPDATE public.operational_tasks SET status = 'completed', updated_at = NOW() WHERE production_order_id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. REPOSIÇÃO DE POLÍTICAS (IDEMPOTENTE)
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN (
        'recipes', 'inventory_balances', 'inventory_movements', 'central_kitchen_production_suggestions', 
        'production_orders', 'production_order_items', 'operational_tasks', 'production_events'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

CREATE POLICY "admin_all" ON public.recipes FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.inventory_balances FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.inventory_movements FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.central_kitchen_production_suggestions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.production_orders FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.production_order_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.operational_tasks FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.production_events FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "manager_read" ON public.inventory_balances FOR SELECT TO authenticated USING (location_id = (SELECT primary_group_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "manager_read" ON public.production_orders FOR SELECT TO authenticated USING (location_id = (SELECT primary_group_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "manager_read" ON public.recipes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'manager'));

CREATE POLICY "kitchen_all" ON public.production_orders FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'kitchen'));
CREATE POLICY "kitchen_all" ON public.production_order_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'kitchen'));

CREATE POLICY "operator_read" ON public.operational_tasks FOR SELECT TO authenticated USING (responsible_id = auth.uid() OR area_group_id = (SELECT primary_group_id FROM public.users WHERE id = auth.uid()));
