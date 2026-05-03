-- ============================================================
-- SQL CONSOLIDADO HARDENED — Versão Final para Produção
-- Configuração de Esquema, RPCs Transacionais e RLS Blindado
-- ============================================================

-- 1. GARANTIR ESQUEMA (COLUNAS E TABELAS)
DO $$ 
BEGIN
    -- Purchase Orders Evolution
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'order_type') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN order_type text DEFAULT 'internal_replenishment' CHECK (order_type IN ('supplier_purchase', 'internal_replenishment'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'source_location_id') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN source_location_id uuid REFERENCES groups(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'destination_location_id') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN destination_location_id uuid REFERENCES groups(id);
    END IF;

    -- Groups Evolution
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'groups' AND column_name = 'type') THEN
        ALTER TABLE public.groups ADD COLUMN type TEXT DEFAULT 'unit' CHECK (type IN ('unit', 'area', 'department', 'stock_location'));
    END IF;

    -- Operational Tasks Evolution
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'operational_tasks' AND column_name = 'area_group_id') THEN
        ALTER TABLE public.operational_tasks ADD COLUMN area_group_id UUID REFERENCES public.groups(id);
    END IF;

    -- Production Orders Evolution
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'production_orders' AND column_name = 'notes') THEN
        ALTER TABLE public.production_orders ADD COLUMN notes TEXT;
    END IF;

    -- Recipes Evolution
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'ingredient_stock_type') THEN
        ALTER TABLE public.recipes ADD COLUMN ingredient_stock_type TEXT DEFAULT 'raw' CHECK (ingredient_stock_type IN ('raw', 'semi_finished', 'finished'));
    END IF;

    -- Production Order Items Evolution
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'production_order_items' AND column_name = 'source_suggestion_id') THEN
        ALTER TABLE public.production_order_items ADD COLUMN source_suggestion_id UUID;
    END IF;
END $$;

-- 2. BACKFILL DE SEGURANÇA
UPDATE public.groups SET type = 'stock_location' WHERE name ILIKE '%Cozinha%' AND type = 'unit';
UPDATE public.groups SET type = 'unit' WHERE type IS NULL;

-- 3. LIMPEZA TOTAL DE POLÍTICAS
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

-- 4. HABILITAR RLS EM TUDO
ALTER TABLE public.recipes                               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_balances                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.central_kitchen_production_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_orders                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_order_items               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_tasks                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_events                     ENABLE ROW LEVEL SECURITY;

-- 5. FUNÇÕES TRANSACIONAIS HARDENED (SECURITY DEFINER)

-- 5.1 APROVAR PRODUÇÃO
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
BEGIN
    -- 1. Validação de Identidade e Role
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
    SELECT role, primary_group_id INTO v_user_role, v_user_unit FROM public.users WHERE id = v_user_id;
    IF v_user_role NOT IN ('admin', 'manager', 'kitchen') THEN RAISE EXCEPTION 'Sem permissão para aprovar produção'; END IF;

    -- 2. Validação de Unidade (Manager só aprova para a própria unidade)
    IF v_user_role = 'manager' AND v_user_unit != p_location_id THEN
        RAISE EXCEPTION 'Manager não pode aprovar produção para outra unidade';
    END IF;

    -- 3. Criar a Ordem
    INSERT INTO public.production_orders (location_id, created_by, status, notes)
    VALUES (p_location_id, v_user_id, 'pending', p_notes)
    RETURNING id INTO v_order_id;

    -- 4. Processar Itens e Reservar Estoque
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, quantity NUMERIC, suggested_qty NUMERIC, reason TEXT, notes TEXT, source_suggestion_id UUID)
    LOOP
        INSERT INTO public.production_order_items (production_order_id, item_id, planned_qty, approved_qty, status, source_suggestion_id)
        VALUES (v_order_id, v_item.item_id, v_item.suggested_qty, v_item.quantity, 'pending', v_item.source_suggestion_id);

        -- Atualizar sugestão se houver
        IF v_item.source_suggestion_id IS NOT NULL THEN
            UPDATE public.central_kitchen_production_suggestions
            SET status = 'approved', approved_qty = v_item.quantity, adjusted_by = v_user_id, updated_at = NOW()
            WHERE id = v_item.source_suggestion_id;
        END IF;

        -- Reservar Insumos com LOCK
        FOR v_recipe IN SELECT * FROM public.recipes WHERE product_id = v_item.item_id
        LOOP
            v_need := (v_item.quantity * v_recipe.quantity) / (v_recipe.yield_percentage / 100.0);

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

    -- 5. Tarefa MOC
    INSERT INTO public.operational_tasks (type, title, description, area_group_id, status, production_order_id, conclusion_criteria)
    VALUES ('production', 'Produção — Ordem #' || substring(v_order_id::text, 1, 8), 'Executar produção planejada.', p_location_id, 'pending', v_order_id, 'Finalizado com registro de perdas.');

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5.2 CANCELAR PRODUÇÃO
CREATE OR REPLACE FUNCTION public.cancel_production_order(p_order_id UUID) RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_role TEXT;
    v_user_unit UUID;
    v_loc_id UUID;
    v_status TEXT;
    v_item RECORD;
    v_recipe RECORD;
    v_unreserve NUMERIC;
BEGIN
    -- 1. Validação de Permissão
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
    SELECT role, primary_group_id INTO v_user_role, v_user_unit FROM public.users WHERE id = v_user_id;
    SELECT location_id, status INTO v_loc_id, v_status FROM public.production_orders WHERE id = p_order_id;
    
    IF v_status != 'pending' THEN RAISE EXCEPTION 'Apenas ordens pendentes podem ser canceladas'; END IF;
    IF v_user_role NOT IN ('admin', 'kitchen') AND (v_user_role != 'manager' OR v_user_unit != v_loc_id) THEN
        RAISE EXCEPTION 'Sem permissão para cancelar esta ordem';
    END IF;

    -- 2. Liberar Reservas
    FOR v_item IN SELECT * FROM public.production_order_items WHERE production_order_id = p_order_id
    LOOP
        FOR v_recipe IN SELECT * FROM public.recipes WHERE product_id = v_item.item_id
        LOOP
            v_unreserve := (v_item.approved_qty * v_recipe.quantity) / (v_recipe.yield_percentage / 100.0);

            -- LOCK E ATUALIZAÇÃO
            UPDATE public.inventory_balances
            SET reserved_qty = GREATEST(0, reserved_qty - v_unreserve), updated_at = NOW()
            WHERE item_id = v_recipe.ingredient_id AND location_id = v_loc_id AND type = v_recipe.ingredient_stock_type;

            INSERT INTO public.inventory_movements (item_id, location_id, type, quantity, reference_type, reference_id, created_by, notes)
            VALUES (v_recipe.ingredient_id, v_loc_id, 'unreservation', -v_unreserve, 'production_order', p_order_id, v_user_id, 'Liberação por cancelamento');
        END LOOP;
    END LOOP;

    -- 3. Finalizar Status
    UPDATE public.production_orders SET status = 'canceled', updated_at = NOW() WHERE id = p_order_id;
    UPDATE public.operational_tasks SET status = 'canceled', updated_at = NOW() WHERE production_order_id = p_order_id;

    INSERT INTO public.production_events (production_order_id, user_id, event_type, payload)
    VALUES (p_order_id, v_user_id, 'order_canceled', '{}');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5.3 FINALIZAR PRODUÇÃO
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
    v_order_item RECORD;
BEGIN
    -- 1. Validação de Segurança e Estado
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
    SELECT role, primary_group_id INTO v_user_role, v_user_unit FROM public.users WHERE id = v_user_id;
    SELECT location_id, status INTO v_loc_id, v_status FROM public.production_orders WHERE id = p_order_id;

    IF v_status IN ('completed', 'canceled') THEN RAISE EXCEPTION 'Ordem já finalizada ou cancelada'; END IF;
    -- Operador pode finalizar se estiver vinculado à unidade ou for o responsável
    IF v_user_role NOT IN ('admin', 'kitchen') AND (v_user_unit != v_loc_id) THEN
        RAISE EXCEPTION 'Sem permissão para finalizar produção nesta unidade';
    END IF;

    -- 2. Processar Cada Item Produzido
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, produced_qty NUMERIC, lost_qty NUMERIC)
    LOOP
        -- Buscar dados originais do planejamento para liberar reserva correta
        SELECT approved_qty INTO v_originally_reserved FROM public.production_order_items 
        WHERE production_order_id = p_order_id AND item_id = v_item.item_id;

        -- 2.1 Baixar Insumos
        FOR v_recipe IN SELECT * FROM public.recipes WHERE product_id = v_item.item_id
        LOOP
            -- Consumo real baseado na produção total tentada (produzido + perdido)
            v_consumed := (v_item.produced_qty + v_item.lost_qty) * v_recipe.quantity / (v_recipe.yield_percentage / 100.0);
            
            -- Quanto havíamos reservado originalmente para este item
            v_unreserve := (v_originally_reserved * v_recipe.quantity) / (v_recipe.yield_percentage / 100.0);

            -- LOCK NO BALANÇO
            UPDATE public.inventory_balances
            SET quantity = quantity - v_consumed,
                reserved_qty = GREATEST(0, reserved_qty - v_unreserve), -- Libera a reserva original
                updated_at = NOW()
            WHERE item_id = v_recipe.ingredient_id AND location_id = v_loc_id AND type = v_recipe.ingredient_stock_type;

            -- Registrar Movimentos
            INSERT INTO public.inventory_movements (item_id, location_id, type, quantity, reference_type, reference_id, created_by, notes)
            VALUES (v_recipe.ingredient_id, v_loc_id, 'production_consumed_raw', -v_consumed, 'production_order', p_order_id, v_user_id, 'Consumo real');
            
            -- Se houve sobra de reserva (produziu menos que o planejado)
            IF v_unreserve > v_consumed THEN
                INSERT INTO public.inventory_movements (item_id, location_id, type, quantity, reference_type, reference_id, created_by, notes)
                VALUES (v_recipe.ingredient_id, v_loc_id, 'unreservation', -(v_unreserve - v_consumed), 'production_order', p_order_id, v_user_id, 'Sobra de reserva liberada');
            END IF;
        END LOOP;

        -- 2.2 Entrada do Produto Acabado
        UPDATE public.inventory_balances
        SET quantity = quantity + v_item.produced_qty, updated_at = NOW()
        WHERE item_id = v_item.item_id AND location_id = v_loc_id AND type = 'finished'
        FOR UPDATE;

        IF NOT FOUND THEN
            INSERT INTO public.inventory_balances (item_id, location_id, type, quantity)
            VALUES (v_item.item_id, v_loc_id, 'finished', v_item.produced_qty);
        END IF;

        INSERT INTO public.inventory_movements (item_id, location_id, type, quantity, reference_type, reference_id, created_by)
        VALUES (v_item.item_id, v_loc_id, 'production_added_finished', v_item.produced_qty, 'production_order', p_order_id, v_user_id);

        -- Registrar Perda se houver
        IF v_item.lost_qty > 0 THEN
            INSERT INTO public.inventory_movements (item_id, location_id, type, quantity, reference_type, reference_id, created_by, notes)
            VALUES (v_item.item_id, v_loc_id, 'waste', -v_item.lost_qty, 'production_order', p_order_id, v_user_id, 'Perda na finalização');
        END IF;

        -- 2.3 Atualizar Item da Ordem
        UPDATE public.production_order_items
        SET produced_qty = v_item.produced_qty, lost_qty = v_item.lost_qty, status = 'produced'
        WHERE production_order_id = p_order_id AND item_id = v_item.item_id;
    END LOOP;

    -- 3. Concluir Ordem e Tarefa
    UPDATE public.production_orders SET status = 'completed', completed_at = NOW() WHERE id = p_order_id;
    UPDATE public.operational_tasks SET status = 'completed', updated_at = NOW() WHERE production_order_id = p_order_id;

    INSERT INTO public.production_events (production_order_id, user_id, event_type, payload)
    VALUES (p_order_id, v_user_id, 'production_completed', p_items);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. RLS BLINDADO (POLICIES LIMPAS E RESTRITIVAS)

-- 6.1 Admin: Acesso Global
CREATE POLICY "admin_all" ON public.recipes                               FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.inventory_balances                     FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.inventory_movements                    FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.central_kitchen_production_suggestions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.production_orders                     FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.production_order_items               FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.operational_tasks                     FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.production_events                     FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- 6.2 Manager: Unidade Própria
CREATE POLICY "manager_read_own" ON public.inventory_balances FOR SELECT TO authenticated USING (location_id = (SELECT primary_group_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "manager_read_own" ON public.production_orders FOR SELECT TO authenticated USING (location_id = (SELECT primary_group_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "manager_read_own" ON public.production_order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.production_orders po WHERE po.id = production_order_id AND po.location_id = (SELECT primary_group_id FROM public.users WHERE id = auth.uid())));
CREATE POLICY "manager_all_own" ON public.operational_tasks FOR ALL TO authenticated USING (area_group_id = (SELECT primary_group_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "manager_read_recipes" ON public.recipes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'manager'));

-- 6.3 Kitchen: Produção Central
CREATE POLICY "kitchen_all" ON public.production_orders FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'kitchen'));
CREATE POLICY "kitchen_all" ON public.production_order_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'kitchen'));
CREATE POLICY "kitchen_read_balances" ON public.inventory_balances FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'kitchen'));
CREATE POLICY "kitchen_read_recipes" ON public.recipes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'kitchen'));

-- 6.4 Operator: Leitura de Tarefas Apenas (Sem Update Direto)
CREATE POLICY "operator_read_tasks" ON public.operational_tasks 
    FOR SELECT TO authenticated 
    USING (responsible_id = auth.uid() OR area_group_id = (SELECT primary_group_id FROM public.users WHERE id = auth.uid()));

-- 6.5 Recipes: Restrição (Apenas Admin, Manager e Kitchen)
-- Já coberto pelas regras acima.
