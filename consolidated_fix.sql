-- ============================================================
-- SQL CONSOLIDADO — Configuração Final e Correção de Esquema
-- Aplique este bloco no SQL Editor do Supabase
-- ============================================================

-- 1. GARANTIR COLUNAS EM TABELAS EXISTENTES
DO $$ 
BEGIN
    -- Purchase Orders
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'order_type') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN order_type text DEFAULT 'internal_replenishment';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'source_location_id') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN source_location_id uuid REFERENCES groups(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'destination_location_id') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN destination_location_id uuid REFERENCES groups(id);
    END IF;

    -- Groups
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'groups' AND column_name = 'type') THEN
        ALTER TABLE public.groups ADD COLUMN type TEXT DEFAULT 'unit' CHECK (type IN ('unit', 'area', 'department', 'stock_location'));
    END IF;

    -- Operational Tasks
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'operational_tasks' AND column_name = 'area_group_id') THEN
        ALTER TABLE public.operational_tasks ADD COLUMN area_group_id UUID REFERENCES public.groups(id);
    END IF;

    -- Production Orders
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'production_orders' AND column_name = 'notes') THEN
        ALTER TABLE public.production_orders ADD COLUMN notes TEXT;
    END IF;

    -- Recipes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'ingredient_stock_type') THEN
        ALTER TABLE public.recipes ADD COLUMN ingredient_stock_type TEXT DEFAULT 'raw' CHECK (ingredient_stock_type IN ('raw', 'semi_finished', 'finished'));
    END IF;
END $$;

-- 2. BACKFILL DE SEGURANÇA
UPDATE public.groups SET type = 'stock_location' WHERE name ILIKE '%Cozinha%' AND type = 'unit';
UPDATE public.groups SET type = 'unit' WHERE type IS NULL;

-- 3. LIMPEZA TOTAL DE POLÍTICAS (Para recriar do zero)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'recipes', 'inventory_balances', 'inventory_movements', 
            'central_kitchen_production_suggestions', 'production_orders', 
            'production_order_items', 'operational_tasks', 'production_events'
        ) 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- 4. FUNÇÕES TRANSACIONAIS BLINDADAS (RPCs)

CREATE OR REPLACE FUNCTION public.approve_production_plan(
    p_location_id UUID,
    p_notes TEXT,
    p_items JSONB
) RETURNS UUID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_role TEXT;
    v_order_id UUID;
    v_item RECORD;
    v_recipe RECORD;
    v_need NUMERIC;
    v_available NUMERIC;
    v_item_unit TEXT;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
    SELECT role INTO v_user_role FROM public.users WHERE id = v_user_id;
    IF v_user_role NOT IN ('admin', 'manager', 'kitchen') AND (v_user_role != 'operator') THEN -- Permitir operator se for Cozinha
        -- Validação adicional opcional
    END IF;

    INSERT INTO public.production_orders (location_id, created_by, status, notes)
    VALUES (p_location_id, v_user_id, 'pending', p_notes)
    RETURNING id INTO v_order_id;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, quantity NUMERIC, suggested_qty NUMERIC, reason TEXT, notes TEXT, source_suggestion_id UUID)
    LOOP
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
                -- Se não existe linha de balanço, v_available será NULL. Vamos assumir que se não existe, tem 0.
                RAISE EXCEPTION 'Estoque insuficiente para o insumo % (Disponível: %, Necessário: %)', 
                    (SELECT name FROM public.purchase_items WHERE id = v_recipe.ingredient_id), 
                    COALESCE(v_available, 0), v_need;
            END IF;

            UPDATE public.inventory_balances SET reserved_qty = reserved_qty + v_need, updated_at = NOW()
            WHERE item_id = v_recipe.ingredient_id AND location_id = p_location_id AND type = v_recipe.ingredient_stock_type;
        END LOOP;
    END LOOP;

    INSERT INTO public.operational_tasks (type, title, description, area_group_id, status, production_order_id, conclusion_criteria)
    VALUES ('production', 'Produção — Ordem #' || substring(v_order_id::text, 1, 8), 'Executar produção.', p_location_id, 'pending', v_order_id, 'Finalizado com registro de perdas.');

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.complete_production_order(
    p_order_id UUID,
    p_items JSONB
) RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_loc_id UUID;
    v_item RECORD;
    v_recipe RECORD;
    v_consumed NUMERIC;
BEGIN
    SELECT location_id INTO v_loc_id FROM public.production_orders WHERE id = p_order_id;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, produced_qty NUMERIC, lost_qty NUMERIC)
    LOOP
        FOR v_recipe IN SELECT * FROM public.recipes WHERE product_id = v_item.item_id
        LOOP
            v_consumed := (v_item.produced_qty + v_item.lost_qty) * v_recipe.quantity / (v_recipe.yield_percentage / 100.0);
            UPDATE public.inventory_balances
            SET quantity = quantity - v_consumed, reserved_qty = reserved_qty - v_consumed, updated_at = NOW()
            WHERE item_id = v_recipe.ingredient_id AND location_id = v_loc_id AND type = v_recipe.ingredient_stock_type;

            INSERT INTO public.inventory_movements (item_id, location_id, type, quantity, reference_type, reference_id, created_by)
            VALUES (v_recipe.ingredient_id, v_loc_id, 'production_consumed_raw', -v_consumed, 'production_order', p_order_id, v_user_id);
        END LOOP;

        UPDATE public.inventory_balances SET quantity = quantity + v_item.produced_qty, updated_at = NOW()
        WHERE item_id = v_item.item_id AND location_id = v_loc_id AND type = 'finished';

        IF NOT FOUND THEN
            INSERT INTO public.inventory_balances (item_id, location_id, type, quantity)
            VALUES (v_item.item_id, v_loc_id, 'finished', v_item.produced_qty);
        END IF;

        UPDATE public.production_order_items SET produced_qty = v_item.produced_qty, lost_qty = v_item.lost_qty, status = 'produced'
        WHERE production_order_id = p_order_id AND item_id = v_item.item_id;
    END LOOP;

    UPDATE public.production_orders SET status = 'completed', completed_at = NOW() WHERE id = p_order_id;
    UPDATE public.operational_tasks SET status = 'completed', updated_at = NOW() WHERE production_order_id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. REPOSIÇÃO DE RLS COMPLETO
CREATE POLICY "admin_all" ON public.recipes FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.inventory_balances FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.inventory_movements FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.central_kitchen_production_suggestions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.production_orders FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.production_order_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.operational_tasks FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "manager_read" ON public.inventory_balances FOR SELECT TO authenticated USING (location_id = (SELECT primary_group_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "manager_read" ON public.production_orders FOR SELECT TO authenticated USING (location_id = (SELECT primary_group_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "manager_read" ON public.operational_tasks FOR SELECT TO authenticated USING (area_group_id = (SELECT primary_group_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "kitchen_all" ON public.production_orders FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'kitchen'));
CREATE POLICY "kitchen_all" ON public.production_order_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'kitchen'));

CREATE POLICY "operator_read" ON public.operational_tasks FOR SELECT TO authenticated USING (responsible_id = auth.uid() OR area_group_id = (SELECT primary_group_id FROM public.users WHERE id = auth.uid()));

-- Permitir leitura de receitas para todos
CREATE POLICY "read_recipes" ON public.recipes FOR SELECT TO authenticated USING (true);
