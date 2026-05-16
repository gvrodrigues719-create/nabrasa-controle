-- =========================================================================================
-- Migration: Hardening de Segurança - Cozinha Central
-- Descrição: Habilita RLS e define políticas restritivas para tabelas de Recebimento.
-- =========================================================================================

-- 1. Habilitar RLS em todas as tabelas novas
ALTER TABLE public.ck_receivings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ck_receiving_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ck_receiving_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ck_receiving_catalog_items ENABLE ROW LEVEL SECURITY;

-- 2. Limpeza de políticas (idempotência)
DO $$ 
DECLARE 
    t TEXT;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN (
        'ck_receivings', 'ck_receiving_items', 'ck_receiving_events', 'ck_receiving_catalog_items'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS "admin_kitchen_all" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "service_role_all" ON public.%I', t);
    END LOOP;
END $$;

-- 3. Políticas para ck_receivings
CREATE POLICY "admin_kitchen_all" ON public.ck_receivings
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND (users.role = 'admin' OR users.role = 'kitchen')
    )
);

-- 4. Políticas para ck_receiving_items
CREATE POLICY "admin_kitchen_all" ON public.ck_receiving_items
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND (users.role = 'admin' OR users.role = 'kitchen')
    )
);

-- 5. Políticas para ck_receiving_events
CREATE POLICY "admin_kitchen_all" ON public.ck_receiving_events
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND (users.role = 'admin' OR users.role = 'kitchen')
    )
);

-- 6. Políticas para ck_receiving_catalog_items
CREATE POLICY "admin_kitchen_all" ON public.ck_receiving_catalog_items
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND (users.role = 'admin' OR users.role = 'kitchen')
    )
);
