-- ============================================================
-- Módulo de Compras e Abastecimento — NaBrasa Controle
-- Migration: 20260427_purchase_module.sql
-- ============================================================

-- ── 1. CATÁLOGO MESTRE DE ITENS ─────────────────────────────
-- NOTE: users.role aceita: admin | manager | operator | kitchen
-- O role 'kitchen' é exclusivo da Cozinha Central (ver RLS abaixo)

CREATE TABLE IF NOT EXISTS purchase_items (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL,
    category        text NOT NULL,
    order_unit      text NOT NULL DEFAULT 'un',   -- unidade de pedido (cx, kg, un...)
    count_unit      text NOT NULL DEFAULT 'un',   -- unidade de contagem
    allows_decimal  boolean NOT NULL DEFAULT false,
    min_stock       numeric(10, 3),
    max_stock       numeric(10, 3),
    origin          text NOT NULL DEFAULT 'cozinha_central', -- cozinha_central | fornecedor_externo
    is_active       boolean NOT NULL DEFAULT true,
    -- Itens importados com mín/máx ausente ou mín > máx ficam pendentes de revisão pelo admin
    pending_review  boolean NOT NULL DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 2. PARÂMETROS POR LOJA ──────────────────────────────────
-- Permite personalizar mín/máx por unidade sem tocar no cadastro mestre
CREATE TABLE IF NOT EXISTS store_item_parameters (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id    uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    item_id     uuid NOT NULL REFERENCES purchase_items(id) ON DELETE CASCADE,
    min_stock   numeric(10, 3),
    max_stock   numeric(10, 3),
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (store_id, item_id)
);

-- ── 3. PEDIDOS DE ABASTECIMENTO ─────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_orders (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id     uuid NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
    created_by   uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status       text NOT NULL DEFAULT 'rascunho'
                 CHECK (status IN (
                     'rascunho', 'enviado', 'em_analise', 'em_separacao',
                     'separado', 'em_entrega', 'entregue', 'recebido',
                     'divergente', 'cancelado'
                 )),
    notes        text,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    sent_at      timestamptz,
    received_at  timestamptz
);

-- ── 4. ITENS DO PEDIDO ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_id         uuid NOT NULL REFERENCES purchase_items(id) ON DELETE RESTRICT,
    requested_qty   numeric(10, 3) NOT NULL,
    separated_qty   numeric(10, 3),    -- preenchido pela Cozinha Central
    received_qty    numeric(10, 3),    -- confirmado pelo Gerente no recebimento
    notes           text,              -- obs da cozinha ou do gerente
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 5. EVENTOS / AUDITORIA ──────────────────────────────────
-- Registro imutável de cada ação relevante sobre um pedido
CREATE TABLE IF NOT EXISTS purchase_order_events (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    user_id     uuid REFERENCES users(id) ON DELETE SET NULL,
    event_type  text NOT NULL,  -- status_changed | item_edited | note_added | qty_updated | cancelled
    payload     jsonb,          -- dados contextuais (status_from, status_to, item_id, qty...)
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── ÍNDICES ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_purchase_orders_store     ON purchase_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status    ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created   ON purchase_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order ON purchase_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_events_order ON purchase_order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_active     ON purchase_items(is_active);
CREATE INDEX IF NOT EXISTS idx_purchase_items_category   ON purchase_items(category);
CREATE INDEX IF NOT EXISTS idx_store_item_params         ON store_item_parameters(store_id, item_id);

-- ── TRIGGERS: updated_at automático ─────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_purchase_items_updated_at') THEN
        CREATE TRIGGER trg_purchase_items_updated_at
            BEFORE UPDATE ON purchase_items
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_purchase_orders_updated_at') THEN
        CREATE TRIGGER trg_purchase_orders_updated_at
            BEFORE UPDATE ON purchase_orders
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_purchase_order_items_updated_at') THEN
        CREATE TRIGGER trg_purchase_order_items_updated_at
            BEFORE UPDATE ON purchase_order_items
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_store_item_params_updated_at') THEN
        CREATE TRIGGER trg_store_item_params_updated_at
            BEFORE UPDATE ON store_item_parameters
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

-- ── RLS (Row Level Security) ─────────────────────────────────
ALTER TABLE purchase_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_item_parameters   ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_events   ENABLE ROW LEVEL SECURITY;

-- purchase_items: todos autenticados lêem itens ativos; só admin escreve
CREATE POLICY "purchase_items_read" ON purchase_items
    FOR SELECT TO authenticated
    USING (is_active = true OR EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
    ));

CREATE POLICY "purchase_items_write" ON purchase_items
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- purchase_orders: gerente vê pedidos da sua loja; kitchen/admin vê tudo não-rascunho
CREATE POLICY "purchase_orders_manager_read" ON purchase_orders
    FOR SELECT TO authenticated
    USING (
        -- gerente vê seus próprios pedidos
        created_by = auth.uid()
        OR store_id = (SELECT primary_group_id FROM users WHERE id = auth.uid())
        -- kitchen e admin vêem tudo
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'kitchen'))
    );

CREATE POLICY "purchase_orders_manager_write" ON purchase_orders
    FOR INSERT TO authenticated
    WITH CHECK (
        created_by = auth.uid()
        AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );

CREATE POLICY "purchase_orders_update" ON purchase_orders
    FOR UPDATE TO authenticated
    USING (
        created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'kitchen'))
    );

-- purchase_order_items: mesmo acesso que o pedido pai
CREATE POLICY "purchase_order_items_select" ON purchase_order_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM purchase_orders po
            WHERE po.id = order_id
            AND (
                po.created_by = auth.uid()
                OR po.store_id = (SELECT primary_group_id FROM users WHERE id = auth.uid())
                OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'kitchen'))
            )
        )
    );

CREATE POLICY "purchase_order_items_write" ON purchase_order_items
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM purchase_orders po
            WHERE po.id = order_id
            AND (
                po.created_by = auth.uid()
                OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'kitchen'))
            )
        )
    );

-- purchase_order_events: leitura para todos com acesso ao pedido; escrita pela server action
CREATE POLICY "purchase_order_events_select" ON purchase_order_events
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM purchase_orders po
            WHERE po.id = order_id
            AND (
                po.created_by = auth.uid()
                OR po.store_id = (SELECT primary_group_id FROM users WHERE id = auth.uid())
                OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'kitchen'))
            )
        )
    );

CREATE POLICY "purchase_order_events_insert" ON purchase_order_events
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- store_item_parameters: admin gerencia; manager/kitchen lê os da sua loja
CREATE POLICY "store_item_params_read" ON store_item_parameters
    FOR SELECT TO authenticated
    USING (
        store_id = (SELECT primary_group_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'kitchen'))
    );

CREATE POLICY "store_item_params_write" ON store_item_parameters
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
