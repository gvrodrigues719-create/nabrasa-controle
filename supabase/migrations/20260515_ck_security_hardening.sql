-- =========================================================================================
-- Migration: Hardening de Segurança - Cozinha Central / Recebimentos
-- Objetivo: Habilitar RLS e restringir acesso das tabelas CK a admin/kitchen
--
-- NOTA: Esta RLS protege contra acesso direto via PostgREST/API.
-- Operações reais de usuários PIN/Session passam por Server Actions (service_role)
-- que realizam a validação de identidade e macro_sector no servidor.
-- =========================================================================================

-- 1. Habilitar RLS
ALTER TABLE public.ck_receivings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ck_receiving_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ck_receiving_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ck_receiving_catalog_items ENABLE ROW LEVEL SECURITY;

-- 2. Limpar policies antigas de forma idempotente
DO $$ 
DECLARE 
    t TEXT;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN (
            'ck_receivings', 
            'ck_receiving_items', 
            'ck_receiving_events', 
            'ck_receiving_catalog_items'
        ) 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "admin_kitchen_all" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "service_role_all" ON public.%I', t);
    END LOOP;
END $$;

-- 3. Policy: ck_receivings
CREATE POLICY "admin_kitchen_all" ON public.ck_receivings
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'kitchen')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'kitchen')
    )
);

-- 4. Policy: ck_receiving_items
CREATE POLICY "admin_kitchen_all" ON public.ck_receiving_items
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'kitchen')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'kitchen')
    )
);

-- 5. Policy: ck_receiving_events
CREATE POLICY "admin_kitchen_all" ON public.ck_receiving_events
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'kitchen')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'kitchen')
    )
);

-- 6. Policy: ck_receiving_catalog_items
CREATE POLICY "admin_kitchen_all" ON public.ck_receiving_catalog_items
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'kitchen')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'kitchen')
    )
);
