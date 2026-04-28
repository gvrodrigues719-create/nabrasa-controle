-- ============================================================
-- SQL CONSOLIDADO V2 — Versão Final Blindada (CORRIGIDA)
-- Configuração de Esquema, RPCs Transacionais e RLS Restritivo
-- ============================================================

-- 1. GARANTIR ESQUEMA E CONSTRAINTS
DO $$ 
BEGIN
    -- [Esquema de Tabelas - Repetir Verificações para Garantir Estado]
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'ingredient_stock_type') THEN
        ALTER TABLE public.recipes ADD COLUMN ingredient_stock_type TEXT DEFAULT 'raw' CHECK (ingredient_stock_type IN ('raw', 'semi_finished', 'finished'));
    END IF;
    
    -- Constraint de Rendimento
    ALTER TABLE public.recipes DROP CONSTRAINT IF EXISTS recipes_yield_positive;
    ALTER TABLE public.recipes ADD CONSTRAINT recipes_yield_positive CHECK (yield_percentage > 0);
END $$;

-- 2. FUNÇÕES TRANSACIONAIS V2 (HARDENED & VALIDATED)

-- 2.1 APROVAR PRODUÇÃO
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
    -- 1. Validações de Identidade e Integridade
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
    IF jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Lista de itens vazia'; END IF;

    SELECT role, primary_group_id INTO v_user_role, v_user_unit FROM public.users WHERE id = v_user_id;
    IF v_user_role NOT IN ('admin', 'manager', 'kitchen') THEN RAISE EXCEPTION 'Sem permissão'; END IF;
    IF v_user_role = 'manager' AND v_user_unit != p_location_id THEN RAISE EXCEPTION 'Acesso negado a esta unidade'; END IF;

    -- 2. Criar a Ordem
    INSERT INTO public.production_orders (location_id, created_by, status, notes)
    VALUES (p_location_id, v_user_id, 'pending', p_notes)
    RETURNING id INTO v_order_id;

    -- 3. Processar Itens
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, quantity NUMERIC, suggested_qty NUMERIC, reason TEXT, notes TEXT, source_suggestion_id UUID)
    LOOP
        -- Validação de Quantidades
        IF v_item.quantity <= 0 THEN RAISE EXCEPTION 'Quantidade aprovada deve ser maior que zero'; END IF;
        IF v_item.suggested_qty < 0 THEN RAISE EXCEPTION 'Quantidade sugerida inválida'; END IF;

        SELECT order_unit INTO v_item_unit FROM public.purchase_items WHERE id = v_item.item_id;
        
        INSERT INTO public.production_order_items (production_order_id, item_id, planned_qty, approved_qty, unit, status, source_suggestion_id)
        VALUES (v_order_id, v_item.item_id, v_item.suggested_qty, v_item.quantity, COALESCE(v_item_unit, 'un'), 'pending', v_item.source_suggestion_id);

        -- Vínculo com Sugestão
        IF v_item.source_suggestion_id IS NOT NULL THEN
            UPDATE public.central_kitchen_production_suggestions
            SET status = 'approved', approved_qty = v_item.quantity, adjustment_reason = v_item.reason, adjustment_notes = v_item.notes, adjusted_by = v_user_id, updated_at = NOW()
            WHERE id = v_item.source_suggestion_id;
        END IF;

        -- 4. Reservar Insumos com LOCK
        FOR v_recipe IN SELECT * FROM public.recipes WHERE product_id = v_item.item_id
        LOOP
            IF v_recipe.yield_percentage <= 0 THEN RAISE EXCEPTION 'Erro na ficha técnica: rendimento zero'; END IF;
            v_need := (v_item.quantity * v_recipe.quantity) / (v_recipe.yield_percentage / 100.0);

            -- SELECT FOR UPDATE (Lock explícito antes do update)
            SELECT (COALESCE(quantity,0) - COALESCE(reserved_qty,0)) INTO v_available
            FROM public.inventory_balances
            WHERE item_id = v_recipe.ingredient_id AND location_id = p_location_id AND type = v_recipe.ingredient_stock_type
            FOR UPDATE;

            IF v_available IS NULL OR v_available < v_need THEN
                RAISE EXCEPTION 'Estoque insuficiente para o insumo % (Disponível: %, Necessário: %)', 
                    (SELECT name FROM public.purchase_items WHERE id = v_recipe.ingredient_id), 
                    COALESCE(v_available, 0), v_need;
            END IF;

            UPDATE public.inventory_balances
            SET reserved_qty = reserved_qty + v_need, updated_at = NOW()
            WHERE item_id = v_recipe.ingredient_id AND location_id = p_location_id AND type = v_recipe.ingredient_stock_type;

            INSERT INTO public.inventory_movements (item_id, location_id, type, quantity, reference_type, reference_id, created_by, notes)
            VALUES (v_recipe.ingredient_id, p_location_id, 'reservation', v_need, 'production_order', v_order_id, v_user_id, 'Reserva automática');
        END LOOP;
    END LOOP;

    -- Registrar Evento de Aprovação
    INSERT INTO public.production_events (production_order_id, user_id, event_type, payload)
    VALUES (v_order_id, v_user_id, 'production_plan_approved', p_items);

    -- Tarefa MOC
    INSERT INTO public.operational_tasks (type, title, description, area_group_id, status, production_order_id, conclusion_criteria)
    VALUES ('production', 'Produção — Ordem #' || substring(v_order_id::text, 1, 8), 'Executar produção.', p_location_id, 'pending', v_order_id, 'Finalizado com registro de perdas.');

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2.2 FINALIZAR PRODUÇÃO
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
    v_bal RECORD;
BEGIN
    -- 1. Validações de Segurança e Estado
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
    IF jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Lista de itens vazia'; END IF;

    SELECT role, primary_group_id INTO v_user_role, v_user_unit FROM public.users WHERE id = v_user_id;
    SELECT location_id, status INTO v_loc_id, v_status FROM public.production_orders WHERE id = p_order_id;

    IF v_status IN ('completed', 'canceled') THEN RAISE EXCEPTION 'Ordem já finalizada ou cancelada'; END IF;
    IF v_user_role NOT IN ('admin', 'kitchen') AND (v_user_unit != v_loc_id) THEN RAISE EXCEPTION 'Sem permissão nesta unidade'; END IF;

    -- 2. Processar Produção
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, produced_qty NUMERIC, lost_qty NUMERIC)
    LOOP
        -- Validação de Quantidades
        IF v_item.produced_qty < 0 OR v_item.lost_qty < 0 THEN RAISE EXCEPTION 'Quantidades não podem ser negativas'; END IF;
        IF v_item.produced_qty + v_item.lost_qty = 0 THEN RAISE EXCEPTION 'Produção total deve ser maior que zero'; END IF;

        SELECT approved_qty INTO v_originally_reserved FROM public.production_order_items WHERE production_order_id = p_order_id AND item_id = v_item.item_id;

        -- 2.1 Baixar Insumos
        FOR v_recipe IN SELECT * FROM public.recipes WHERE product_id = v_item.item_id
        LOOP
            IF v_recipe.yield_percentage <= 0 THEN RAISE EXCEPTION 'Erro na ficha técnica: rendimento zero'; END IF;
            v_consumed := (v_item.produced_qty + v_item.lost_qty) * v_recipe.quantity / (v_recipe.yield_percentage / 100.0);
            v_unreserve := (v_originally_reserved * v_recipe.quantity) / (v_recipe.yield_percentage / 100.0);

            -- LOCK E VALIDAÇÃO DE SALDO
            SELECT quantity, reserved_qty INTO v_bal FROM public.inventory_balances
            WHERE item_id = v_recipe.ingredient_id AND location_id = v_loc_id AND type = v_recipe.ingredient_stock_type
            FOR UPDATE;

            IF v_bal.quantity < v_consumed THEN RAISE EXCEPTION 'Saldo insuficiente para consumo real'; END IF;
            IF v_bal.reserved_qty < v_unreserve THEN RAISE EXCEPTION 'Inconsistência de reserva detectada'; END IF;

            UPDATE public.inventory_balances
            SET quantity = quantity - v_consumed,
                reserved_qty = reserved_qty - v_unreserve,
                updated_at = NOW()
            WHERE item_id = v_recipe.ingredient_id AND location_id = v_loc_id AND type = v_recipe.ingredient_stock_type;

            INSERT INTO public.inventory_movements (item_id, location_id, type, quantity, reference_type, reference_id, created_by, notes)
            VALUES (v_recipe.ingredient_id, v_loc_id, 'production_consumed_raw', -v_consumed, 'production_order', p_order_id, v_user_id, 'Consumo real');
            
            IF v_unreserve > v_consumed THEN
                INSERT INTO public.inventory_movements (item_id, location_id, type, quantity, reference_type, reference_id, created_by, notes)
                VALUES (v_recipe.ingredient_id, v_loc_id, 'unreservation', -(v_unreserve - v_consumed), 'production_order', p_order_id, v_user_id, 'Liberação de sobra');
            END IF;
        END LOOP;

        -- 2.2 Entrada de Acabado (SELECT FOR UPDATE explícito)
        PERFORM 1 FROM public.inventory_balances WHERE item_id = v_item.item_id AND location_id = v_loc_id AND type = 'finished' FOR UPDATE;
        
        UPDATE public.inventory_balances
        SET quantity = quantity + v_item.produced_qty, updated_at = NOW()
        WHERE item_id = v_item.item_id AND location_id = v_loc_id AND type = 'finished';

        IF NOT FOUND THEN
            INSERT INTO public.inventory_balances (item_id, location_id, type, quantity)
            VALUES (v_item.item_id, v_loc_id, 'finished', v_item.produced_qty);
        END IF;

        INSERT INTO public.inventory_movements (item_id, location_id, type, quantity, reference_type, reference_id, created_by)
        VALUES (v_item.item_id, v_loc_id, 'production_added_finished', v_item.produced_qty, 'production_order', p_order_id, v_user_id);

        IF v_item.lost_qty > 0 THEN
            INSERT INTO public.inventory_movements (item_id, location_id, type, quantity, reference_type, reference_id, created_by, notes)
            VALUES (v_item.item_id, v_loc_id, 'waste', -v_item.lost_qty, 'production_order', p_order_id, v_user_id, 'Perda registrada');
        END IF;

        UPDATE public.production_order_items SET produced_qty = v_item.produced_qty, lost_qty = v_item.lost_qty, status = 'produced'
        WHERE production_order_id = p_order_id AND item_id = v_item.item_id;
    END LOOP;

    UPDATE public.production_orders SET status = 'completed', completed_at = NOW() WHERE id = p_order_id;
    UPDATE public.operational_tasks SET status = 'completed', updated_at = NOW() WHERE production_order_id = p_order_id;

    INSERT INTO public.production_events (production_order_id, user_id, event_type, payload)
    VALUES (p_order_id, v_user_id, 'production_completed', p_items);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. RLS COMPLETO E RESTRITIVO

-- 3.1 Inventory Movements & Suggestions
CREATE POLICY "manager_read_movements" ON public.inventory_movements FOR SELECT TO authenticated 
    USING (location_id = (SELECT primary_group_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "kitchen_read_movements" ON public.inventory_movements FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'kitchen'));

CREATE POLICY "manager_manage_suggestions" ON public.central_kitchen_production_suggestions FOR ALL TO authenticated 
    USING (source_location_id = (SELECT primary_group_id FROM public.users WHERE id = auth.uid()) OR destination_location_id = (SELECT primary_group_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "kitchen_manage_suggestions" ON public.central_kitchen_production_suggestions FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'kitchen'));

-- 3.2 Role Kitchen Restrita (Apenas Cozinha Central/Stock Locations)
-- Aplicar em production_orders
ALTER POLICY "kitchen_all" ON public.production_orders 
    USING (EXISTS (SELECT 1 FROM public.users u JOIN public.groups g ON u.primary_group_id = g.id WHERE u.id = auth.uid() AND u.role = 'kitchen' AND g.type = 'stock_location'));

-- 3.3 Recipes (Admin, Manager, Kitchen)
CREATE POLICY "recipes_read_restricted" ON public.recipes FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'kitchen')));

-- Admin all
CREATE POLICY "admin_all_global" ON public.central_kitchen_production_suggestions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all_global" ON public.inventory_movements FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
