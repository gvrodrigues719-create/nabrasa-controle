-- ============================================================
-- Planejamento de Produção e Cozinha Central (REVISADO)
-- Migration: 20260427_kitchen_production_planning.sql
-- ============================================================

-- 1. FICHAS TÉCNICAS (RECIPES)
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.purchase_items(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES public.purchase_items(id) ON DELETE CASCADE,
    quantity NUMERIC(10, 4) NOT NULL, 
    unit TEXT NOT NULL, -- Unidade da ficha técnica
    yield_percentage NUMERIC(5, 2) DEFAULT 100.0, -- Rendimento em %
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, ingredient_id)
);

-- 2. SALDO DE ESTOQUE POR LOCALIZAÇÃO (INVENTORY BALANCES)
CREATE TABLE IF NOT EXISTS public.inventory_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.purchase_items(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    quantity NUMERIC(10, 3) NOT NULL DEFAULT 0,
    reserved_qty NUMERIC(10, 3) NOT NULL DEFAULT 0, -- Reserva para ordens em andamento
    type TEXT NOT NULL CHECK (type IN ('raw', 'semi_finished', 'finished')),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(item_id, location_id, type)
);

-- 3. MOVIMENTAÇÕES DE ESTOQUE (HISTORY)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.purchase_items(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'production_consumed_raw',
        'production_added_finished',
        'manual_adjustment',
        'transfer_out',
        'transfer_in',
        'waste',
        'reservation',
        'unreservation'
    )),
    quantity NUMERIC(10, 3) NOT NULL,
    reference_type TEXT, -- 'production_order', 'purchase_order', etc
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SUGESTÕES DE PRODUÇÃO (PRODUCTION SUGGESTIONS)
CREATE TABLE IF NOT EXISTS public.central_kitchen_production_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE, -- Vínculo com o pedido original
    planning_batch_id UUID, -- Agrupador de um lote de planejamento
    item_id UUID NOT NULL REFERENCES public.purchase_items(id) ON DELETE CASCADE,
    source_location_id UUID REFERENCES public.groups(id), -- Onde será produzido
    destination_location_id UUID REFERENCES public.groups(id), -- Para onde vai
    requested_qty NUMERIC(10, 3) NOT NULL,
    ready_stock_qty NUMERIC(10, 3) NOT NULL DEFAULT 0, -- Saldo na source_location
    scheduled_qty NUMERIC(10, 3) NOT NULL DEFAULT 0,
    suggested_qty NUMERIC(10, 3) NOT NULL,
    approved_qty NUMERIC(10, 3),
    adjustment_reason TEXT CHECK (adjustment_reason IN (
        'estoque físico diferente',
        'produção estratégica',
        'validade próxima',
        'pedido ajustado',
        'falta de insumo',
        'decisão do gestor',
        'outro'
    )),
    adjustment_notes TEXT,
    adjusted_by UUID REFERENCES public.users(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'dismissed')),
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ORDENS DE PRODUÇÃO (PRODUCTION ORDERS)
CREATE TABLE IF NOT EXISTS public.production_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'canceled')),
    location_id UUID NOT NULL REFERENCES public.groups(id), -- Unidade responsável
    notes TEXT,
    created_by UUID NOT NULL REFERENCES public.users(id),
    approved_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.production_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_order_id UUID NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.purchase_items(id),
    source_suggestion_id UUID REFERENCES public.central_kitchen_production_suggestions(id),
    planned_qty NUMERIC(10, 3) NOT NULL, -- O que foi sugerido
    approved_qty NUMERIC(10, 3) NOT NULL, -- O que o gestor aprovou
    produced_qty NUMERIC(10, 3) DEFAULT 0, -- O que foi realmente feito
    lost_qty NUMERIC(10, 3) DEFAULT 0, -- Perda registrada
    unit TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'produced', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TAREFAS OPERACIONAIS (MOC)
CREATE TABLE IF NOT EXISTS public.operational_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL DEFAULT 'production' CHECK (type IN ('production', 'delivery', 'maintenance', 'other')),
    title TEXT NOT NULL,
    description TEXT,
    area TEXT,
    responsible_id UUID REFERENCES public.users(id),
    deadline TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'canceled')),
    conclusion_criteria TEXT,
    evidence_url TEXT,
    production_order_id UUID REFERENCES public.production_orders(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. AUDITORIA (PRODUCTION EVENTS)
CREATE TABLE IF NOT EXISTS public.production_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_order_id UUID REFERENCES public.production_orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id),
    event_type TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── ÍNDICES ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_inventory_balances_composite ON public.inventory_balances(location_id, item_id, type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON public.inventory_movements(item_id, location_id);
CREATE INDEX IF NOT EXISTS idx_production_suggestions_batch ON public.central_kitchen_production_suggestions(planning_batch_id);

-- ── RLS (Row Level Security) ─────────────────────────────────
ALTER TABLE public.recipes                               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_balances                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.central_kitchen_production_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_orders                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_order_items               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_tasks                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_events                     ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RESTRITIVAS

-- Admin: tudo
CREATE POLICY "admin_all" ON public.recipes FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
-- Repetir para todas as tabelas... (simplificando abaixo)

-- Manager: vê sua localização
CREATE POLICY "manager_read_location" ON public.inventory_balances FOR SELECT TO authenticated 
    USING (location_id = (SELECT primary_group_id FROM public.users WHERE id = auth.uid()) OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Kitchen: vê Cozinha Central
CREATE POLICY "kitchen_read_production" ON public.production_orders FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role IN ('admin', 'manager') OR (role = 'kitchen'))));

-- Operator: vê suas tarefas
CREATE POLICY "operator_read_tasks" ON public.operational_tasks FOR SELECT TO authenticated 
    USING (responsible_id = auth.uid() OR area = (SELECT g.name FROM public.groups g JOIN public.users u ON g.id = u.primary_group_id WHERE u.id = auth.uid()) OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- Permissões de escrita restritas
CREATE POLICY "planning_write" ON public.central_kitchen_production_suggestions FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'kitchen')));

CREATE POLICY "production_write" ON public.production_orders FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'kitchen')));

CREATE POLICY "inventory_write" ON public.inventory_balances FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'kitchen')));
