-- ============================================================
-- Sugestão de Compras da Loja — Mapeamento e Estrutura
-- Migration: 20260504_purchase_suggestion_mapping.sql
-- Versão 100% Idempotente
-- ============================================================

-- 0. FUNÇÃO AUXILIAR (Garantir existência)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. TABELA DE MAPEAMENTO
CREATE TABLE IF NOT EXISTS public.count_to_purchase_item_map (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    count_item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    purchase_item_id uuid NOT NULL REFERENCES public.purchase_items(id) ON DELETE CASCADE,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(count_item_id, purchase_item_id)
);

-- 2. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_count_to_purchase_count_id ON public.count_to_purchase_item_map(count_item_id);
CREATE INDEX IF NOT EXISTS idx_count_to_purchase_purchase_id ON public.count_to_purchase_item_map(purchase_item_id);

-- 3. HABILITAR RLS
ALTER TABLE public.count_to_purchase_item_map ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DE ACESSO IDEMPOTENTES
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'count_to_purchase_item_map' 
        AND policyname = 'admin_all'
    ) THEN
        CREATE POLICY "admin_all" ON public.count_to_purchase_item_map 
            FOR ALL TO authenticated 
            USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
            WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'count_to_purchase_item_map' 
        AND policyname = 'manager_read'
    ) THEN
        CREATE POLICY "manager_read" ON public.count_to_purchase_item_map 
            FOR SELECT TO authenticated 
            USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'manager'));
    END IF;
END $$;

-- 5. TRIGGER IDEMPOTENTE
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_count_to_purchase_updated_at') THEN
        CREATE TRIGGER trg_count_to_purchase_updated_at
            BEFORE UPDATE ON public.count_to_purchase_item_map
            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
END $$;
