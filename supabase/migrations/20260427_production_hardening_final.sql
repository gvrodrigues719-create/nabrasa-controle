-- ============================================================
-- Blindagem Final — Produção e Abastecimento
-- Migration: 20260427_production_hardening_final.sql
-- ============================================================

-- 1. LIMPEZA TOTAL DE POLÍTICAS ANTIGAS
-- Dropa absolutamente todas as políticas nas tabelas do módulo para garantir estado limpo
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

-- 2. EVOLUÇÃO DO SCHEMA
-- 2.1 Adicionar tipo de estoque do ingrediente na receita
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS ingredient_stock_type TEXT DEFAULT 'raw' 
CHECK (ingredient_stock_type IN ('raw', 'semi_finished', 'finished'));

-- 2.2 Transição de area para area_group_id em operational_tasks
ALTER TABLE public.operational_tasks 
ADD COLUMN IF NOT EXISTS area_group_id UUID REFERENCES public.groups(id);

-- Backfill temporário de area_group_id se possível (baseado no nome da área)
-- UPDATE public.operational_tasks ot SET area_group_id = g.id FROM public.groups g WHERE ot.area = g.name AND ot.area_group_id IS NULL;

-- 2.3 Evolução do groups.type com backfill seguro
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'unit' CHECK (type IN ('unit', 'area', 'department', 'stock_location'));

-- Regra de backfill: grupos que possuem usuários vinculados como manager/operator são 'unit'
UPDATE public.groups SET type = 'unit' WHERE id IN (SELECT primary_group_id FROM public.users WHERE role IN ('manager', 'operator'));
-- Grupos com "Cozinha" no nome são 'stock_location'
UPDATE public.groups SET type = 'stock_location' WHERE name ILIKE '%Cozinha%' AND type = 'unit';

-- 3. FUNÇÕES TRANSACIONAIS HARDENED (SECURITY DEFINER)

-- 3.1 APROVAÇÃO DE PLANO
CREATE OR REPLACE FUNCTION public.approve_production_plan(
    p_location_id UUID,
    p_notes TEXT,
    p_items JSONB -- Array de {item_id, quantity, suggested_qty, reason, notes, source_suggestion_id}
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
    -- Validação de Segurança
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
    SELECT role INTO v_user_role FROM public.users WHERE id = v_user_id;
    IF v_user_role NOT IN ('admin', 'manager', 'kitchen') THEN RAISE EXCEPTION 'Sem permissão'; END IF;

    -- 1. Criar a Ordem de Produção
    INSERT INTO public.production_orders (location_id, created_by, status, notes)
    VALUES (p_location_id, v_user_id, 'pending', p_notes)
    RETURNING id INTO v_order_id;

    -- 2. Processar cada item
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, quantity NUMERIC, suggested_qty NUMERIC, reason TEXT, notes TEXT, source_suggestion_id UUID)
    LOOP
        -- Buscar unidade real do item
        SELECT order_unit INTO v_item_unit FROM public.purchase_items WHERE id = v_item.item_id;

        -- Inserir item da ordem
        INSERT INTO public.production_order_items (
            production_order_id, item_id, planned_qty, approved_qty, unit, status, source_suggestion_id
        ) VALUES (
            v_order_id, v_item.item_id, v_item.suggested_qty, v_item.quantity, COALESCE(v_item_unit, 'un'), 'pending', v_item.source_suggestion_id
        );

        -- Atualizar status da sugestão se houver vínculo
        IF v_item.source_suggestion_id IS NOT NULL THEN
            UPDATE public.central_kitchen_production_suggestions
            SET status = 'approved',
                approved_qty = v_item.quantity,
                adjustment_reason = v_item.reason,
                adjustment_notes = v_item.notes,
                adjusted_by = v_user_id,
                updated_at = NOW()
            WHERE id = v_item.source_suggestion_id;
        END IF;

        -- 3. Reservar insumos com LOCK
        FOR v_recipe IN SELECT * FROM public.recipes WHERE product_id = v_item.item_id
        LOOP
            v_need := (v_item.quantity * v_recipe.quantity) / (v_recipe.yield_percentage / 100.0);

            -- LOCK E VALIDAÇÃO
            SELECT (quantity - reserved_qty) INTO v_available
            FROM public.inventory_balances
            WHERE item_id = v_recipe.ingredient_id 
              AND location_id = p_location_id 
              AND type = v_recipe.ingredient_stock_type
            FOR UPDATE;

            IF v_available IS NULL OR v_available < v_need THEN
                RAISE EXCEPTION 'Estoque insuficiente para o insumo % (Disponível: %, Necessário: %)', 
                    (SELECT name FROM public.purchase_items WHERE id = v_recipe.ingredient_id), 
                    COALESCE(v_available, 0), v_need;
            END IF;

            UPDATE public.inventory_balances
            SET reserved_qty = reserved_qty + v_need, updated_at = NOW()
            WHERE item_id = v_recipe.ingredient_id AND location_id = p_location_id AND type = v_recipe.ingredient_stock_type;

            INSERT INTO public.inventory_movements (
                item_id, location_id, type, quantity, reference_type, reference_id, created_by, notes
            ) VALUES (
                v_recipe.ingredient_id, p_location_id, 'reservation', v_need, 'production_order', v_order_id, v_user_id, 'Reserva automática'
            );
        END LOOP;
    END LOOP;

    -- 4. Gerar Tarefa no MOC
    INSERT INTO public.operational_tasks (
        type, title, description, area_group_id, status, production_order_id, conclusion_criteria
    ) VALUES (
        'production', 'Produção — Ordem #' || substring(v_order_id::text, 1, 8), 'Executar produção.', p_location_id, 'pending', v_order_id, 'Finalizado com registro de perdas.'
    );

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3.2 CANCELAMENTO DE ORDEM
CREATE OR REPLACE FUNCTION public.cancel_production_order(p_order_id UUID) RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_item RECORD;
    v_recipe RECORD;
    v_need NUMERIC;
BEGIN
    -- Liberação de Reservas
    FOR v_item IN SELECT * FROM public.production_order_items WHERE production_order_id = p_order_id
    LOOP
        FOR v_recipe IN SELECT * FROM public.recipes WHERE product_id = v_item.item_id
        LOOP
            v_need := (v_item.approved_qty * v_recipe.quantity) / (v_recipe.yield_percentage / 100.0);

            UPDATE public.inventory_balances
            SET reserved_qty = reserved_qty - v_need, updated_at = NOW()
            WHERE item_id = v_recipe.ingredient_id AND type = v_recipe.ingredient_stock_type;

            INSERT INTO public.inventory_movements (
                item_id, location_id, type, quantity, reference_type, reference_id, created_by, notes
            ) VALUES (
                v_recipe.ingredient_id, (SELECT location_id FROM public.production_orders WHERE id = p_order_id), 
                'unreservation', -v_need, 'production_order', p_order_id, v_user_id, 'Liberação por cancelamento'
            );
        END LOOP;
    END LOOP;

    -- Atualizar status
    UPDATE public.production_orders SET status = 'canceled', updated_at = NOW() WHERE id = p_order_id;
    UPDATE public.operational_tasks SET status = 'canceled', updated_at = NOW() WHERE production_order_id = p_order_id;

    INSERT INTO public.production_events (production_order_id, user_id, event_type, payload)
    VALUES (p_order_id, v_user_id, 'order_canceled', '{}');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3.3 FINALIZAÇÃO DE PRODUÇÃO
CREATE OR REPLACE FUNCTION public.complete_production_order(
    p_order_id UUID,
    p_items JSONB -- Array de {item_id, produced_qty, lost_qty}
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
        -- 1. Consumir Insumos (liberar reserva e baixar saldo)
        FOR v_recipe IN SELECT * FROM public.recipes WHERE product_id = v_item.item_id
        LOOP
            -- O consumo é baseado na tentativa de produção total (produzido + perdido)
            v_consumed := (v_item.produced_qty + v_item.lost_qty) * v_recipe.quantity / (v_recipe.yield_percentage / 100.0);

            UPDATE public.inventory_balances
            SET quantity = quantity - v_consumed,
                reserved_qty = reserved_qty - v_consumed,
                updated_at = NOW()
            WHERE item_id = v_recipe.ingredient_id AND location_id = v_loc_id AND type = v_recipe.ingredient_stock_type;

            INSERT INTO public.inventory_movements (
                item_id, location_id, type, quantity, reference_type, reference_id, created_by, notes
            ) VALUES (
                v_recipe.ingredient_id, v_loc_id, 'production_consumed_raw', -v_consumed, 'production_order', p_order_id, v_user_id, 'Consumo na finalização'
            );
        END LOOP;

        -- 2. Adicionar Produto Acabado
        UPDATE public.inventory_balances
        SET quantity = quantity + v_item.produced_qty, updated_at = NOW()
        WHERE item_id = v_item.item_id AND location_id = v_loc_id AND type = 'finished';

        IF NOT FOUND THEN
            INSERT INTO public.inventory_balances (item_id, location_id, type, quantity)
            VALUES (v_item.item_id, v_loc_id, 'finished', v_item.produced_qty);
        END IF;

        INSERT INTO public.inventory_movements (
            item_id, location_id, type, quantity, reference_type, reference_id, created_by
        ) VALUES (
            v_item.item_id, v_loc_id, 'production_added_finished', v_item.produced_qty, 'production_order', p_order_id, v_user_id
        );

        -- Registrar Perda se houver
        IF v_item.lost_qty > 0 THEN
            INSERT INTO public.inventory_movements (
                item_id, location_id, type, quantity, reference_type, reference_id, created_by, notes
            ) VALUES (
                v_item.item_id, v_loc_id, 'waste', -v_item.lost_qty, 'production_order', p_order_id, v_user_id, 'Perda registrada'
            );
        END IF;

        -- Atualizar item da ordem
        UPDATE public.production_order_items
        SET produced_qty = v_item.produced_qty,
            lost_qty = v_item.lost_qty,
            status = 'produced'
        WHERE production_order_id = p_order_id AND item_id = v_item.item_id;
    END LOOP;

    UPDATE public.production_orders SET status = 'completed', completed_at = NOW() WHERE id = p_order_id;
    UPDATE public.operational_tasks SET status = 'completed', updated_at = NOW() WHERE production_order_id = p_order_id;

    INSERT INTO public.production_events (production_order_id, user_id, event_type, payload)
    VALUES (p_order_id, v_user_id, 'production_completed', p_items);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. RLS BLINDADO (POLICIES LIMPAS)
-- Admin: Tudo
CREATE POLICY "admin_all" ON public.recipes FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.inventory_balances FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.inventory_movements FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.central_kitchen_production_suggestions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.production_orders FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.production_order_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.operational_tasks FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.production_events FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Manager: Sua Unidade
CREATE POLICY "manager_read_own" ON public.inventory_balances FOR SELECT TO authenticated USING (location_id = (SELECT primary_group_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "manager_read_own" ON public.production_orders FOR SELECT TO authenticated USING (location_id = (SELECT primary_group_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "manager_read_own" ON public.operational_tasks FOR SELECT TO authenticated USING (area_group_id = (SELECT primary_group_id FROM public.users WHERE id = auth.uid()));

-- Operator: SELECT RESTRICTED (Sem Update Livre)
CREATE POLICY "operator_read_assigned" ON public.operational_tasks 
    FOR SELECT TO authenticated 
    USING (responsible_id = auth.uid() OR area_group_id = (SELECT primary_group_id FROM public.users WHERE id = auth.uid()));

-- Kitchen: Produção Central
CREATE POLICY "kitchen_all" ON public.production_orders FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'kitchen'));
CREATE POLICY "kitchen_all" ON public.production_order_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'kitchen'));

-- Recipes: Público Interno
CREATE POLICY "read_recipes" ON public.recipes FOR SELECT TO authenticated USING (true);
