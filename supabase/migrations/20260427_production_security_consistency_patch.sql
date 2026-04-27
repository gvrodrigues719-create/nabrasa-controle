-- ============================================================
-- Patch de Segurança e Consistência — Produção e Abastecimento
-- Migration: 20260427_production_security_consistency_patch.sql
-- ============================================================

-- 1. EXTENSÃO DE LOCALIZAÇÃO (GROUPS)
-- Adiciona distinção de tipo para grupos (Unidade física vs Área operacional)
ALTER TABLE public.groups 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'unit' 
CHECK (type IN ('unit', 'area', 'department', 'stock_location'));

-- 2. AJUSTE EM TAREFAS OPERACIONAIS (MOC)
-- Substitui o vínculo frágil por texto por uma referência direta a grupo/área
ALTER TABLE public.operational_tasks 
ADD COLUMN IF NOT EXISTS area_group_id UUID REFERENCES public.groups(id),
DROP COLUMN IF EXISTS area; -- Remove campo texto para evitar inconsistência

-- 3. MIGRAÇÃO SEGURA DE PEDIDOS ANTIGOS
-- Diferencia pedidos de fornecedor de abastecimento interno com base na origem dos itens
UPDATE public.purchase_orders po
SET order_type = (
    SELECT CASE 
        WHEN pi.origin = 'fornecedor_externo' THEN 'supplier_purchase'
        ELSE 'internal_replenishment'
    END
    FROM public.purchase_order_items poi 
    JOIN public.purchase_items pi ON poi.item_id = pi.id 
    WHERE poi.order_id = po.id 
    LIMIT 1
)
WHERE order_type IS NULL OR order_type = 'internal_replenishment';

-- 4. FUNÇÃO TRANSACIONAL DE APROVAÇÃO (COM LOCK)
-- Garante atomicidade e evita concorrência na reserva de estoque
CREATE OR REPLACE FUNCTION public.approve_production_plan(
    p_location_id UUID,
    p_user_id UUID,
    p_notes TEXT,
    p_items JSONB -- Array de {item_id, quantity, suggested_qty, reason, notes}
) RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_item RECORD;
    v_recipe RECORD;
    v_need NUMERIC;
    v_available NUMERIC;
BEGIN
    -- 1. Criar a Ordem de Produção
    INSERT INTO public.production_orders (location_id, created_by, status, notes)
    VALUES (p_location_id, p_user_id, 'pending', p_notes)
    RETURNING id INTO v_order_id;

    -- 2. Processar cada item do planejamento
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, quantity NUMERIC, suggested_qty NUMERIC, reason TEXT, notes TEXT)
    LOOP
        -- Inserir item da ordem
        INSERT INTO public.production_order_items (
            production_order_id, item_id, planned_qty, approved_qty, unit, status
        ) VALUES (
            v_order_id, v_item.item_id, v_item.suggested_qty, v_item.quantity, 'un', 'pending'
        );

        -- 3. Reservar insumos baseados na receita (com LOCK)
        FOR v_recipe IN SELECT * FROM public.recipes WHERE product_id = v_item.item_id
        LOOP
            v_need := (v_item.quantity * v_recipe.quantity) / (v_recipe.yield_percentage / 100.0);

            -- LOCK E VALIDAÇÃO DE DISPONIBILIDADE
            -- Seleciona o saldo com LOCK para evitar concorrência
            SELECT (quantity - reserved_qty) INTO v_available
            FROM public.inventory_balances
            WHERE item_id = v_recipe.ingredient_id 
              AND location_id = p_location_id 
              AND type = 'raw'
            FOR UPDATE;

            IF v_available IS NULL OR v_available < v_need THEN
                RAISE EXCEPTION 'Estoque insuficiente para o insumo % (Disponível: %, Necessário: %)', 
                    (SELECT name FROM public.purchase_items WHERE id = v_recipe.ingredient_id), 
                    COALESCE(v_available, 0), v_need;
            END IF;

            -- Atualizar reserva
            UPDATE public.inventory_balances
            SET reserved_qty = reserved_qty + v_need,
                updated_at = NOW()
            WHERE item_id = v_recipe.ingredient_id 
              AND location_id = p_location_id 
              AND type = 'raw';

            -- Registrar movimentação de reserva
            INSERT INTO public.inventory_movements (
                item_id, location_id, type, quantity, reference_type, reference_id, created_by, notes
            ) VALUES (
                v_recipe.ingredient_id, p_location_id, 'reservation', v_need, 'production_order', v_order_id, p_user_id, 'Reserva automática via planejamento'
            );
        END LOOP;
    END LOOP;

    -- 4. Gerar Tarefa no MOC
    INSERT INTO public.operational_tasks (
        type, title, description, area_group_id, status, production_order_id, conclusion_criteria
    ) VALUES (
        'production', 
        'Produção — Ordem #' || substring(v_order_id::text, 1, 8),
        'Executar produção planejada.',
        p_location_id, -- Assume que o grupo da localização é a área responsável por padrão ou admin ajusta
        'pending',
        v_order_id,
        'Quantidade produzida e perdas registradas.'
    );

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RLS COMPLETO E RESTRITIVO
-- Limpeza de políticas antigas para garantir consistência
DO $$ 
DECLARE 
    t TEXT;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN (
        'recipes', 'inventory_balances', 'inventory_movements', 'central_kitchen_production_suggestions', 
        'production_orders', 'production_order_items', 'operational_tasks', 'production_events'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS "admin_all" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "manager_read" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "kitchen_read" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "operator_read" ON %I', t);
    END LOOP;
END $$;

-- 5.1 Admin: Acesso Total
CREATE POLICY "admin_all" ON public.recipes                               FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.inventory_balances                     FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.inventory_movements                    FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.central_kitchen_production_suggestions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.production_orders                     FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.production_order_items               FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.operational_tasks                     FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all" ON public.production_events                     FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- 5.2 Manager: Acesso aos dados da própria unidade
CREATE POLICY "manager_read_balances" ON public.inventory_balances FOR SELECT TO authenticated 
    USING (location_id = (SELECT primary_group_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "manager_read_orders" ON public.production_orders FOR SELECT TO authenticated 
    USING (location_id = (SELECT primary_group_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "manager_read_order_items" ON public.production_order_items FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.production_orders po WHERE po.id = production_order_id AND po.location_id = (SELECT primary_group_id FROM public.users WHERE id = auth.uid())));

CREATE POLICY "manager_read_movements" ON public.inventory_movements FOR SELECT TO authenticated 
    USING (location_id = (SELECT primary_group_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "manager_read_suggestions" ON public.central_kitchen_production_suggestions FOR SELECT TO authenticated 
    USING (source_location_id = (SELECT primary_group_id FROM public.users WHERE id = auth.uid()) OR destination_location_id = (SELECT primary_group_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "manager_manage_tasks" ON public.operational_tasks FOR ALL TO authenticated 
    USING (area_group_id = (SELECT primary_group_id FROM public.users WHERE id = auth.uid()));

-- 5.3 Kitchen: Acesso à produção da Cozinha Central
CREATE POLICY "kitchen_read_all_balances" ON public.inventory_balances FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'kitchen'));

CREATE POLICY "kitchen_manage_orders" ON public.production_orders FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'kitchen'));

CREATE POLICY "kitchen_manage_order_items" ON public.production_order_items FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'kitchen'));

CREATE POLICY "kitchen_read_movements" ON public.inventory_movements FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'kitchen'));

CREATE POLICY "kitchen_manage_suggestions" ON public.central_kitchen_production_suggestions FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'kitchen'));

-- 5.4 Operator: Apenas tarefas atribuídas ou da área dele
CREATE POLICY "operator_tasks" ON public.operational_tasks FOR ALL TO authenticated 
    USING (
        responsible_id = auth.uid() 
        OR area_group_id = (SELECT primary_group_id FROM public.users WHERE id = auth.uid())
    );

-- 5.5 Recipes e Eventos: Leitura para todos os envolvidos
CREATE POLICY "production_read_recipes" ON public.recipes FOR SELECT TO authenticated 
    USING (true); -- Receitas são conhecimento compartilhado na operação

CREATE POLICY "production_read_events" ON public.production_events FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'kitchen')));
