-- =========================================================================================
-- Migration: Catálogo de Insumos para Recebimentos da Cozinha Central
-- Descrição: Tabela isolada para itens usados apenas no módulo de Recebimentos.
--            NÃO afeta estoque, produção ou contagem.
-- =========================================================================================

-- 1. Criar função handle_updated_at se não existir
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Tabela de catálogo de insumos de recebimento
CREATE TABLE IF NOT EXISTS public.ck_receiving_catalog_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    normalized_name TEXT,
    unit            TEXT,
    category        TEXT,
    notes           TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    purchase_item_id UUID,           -- vínculo futuro opcional, NÃO usado agora
    created_by      UUID,
    updated_by      UUID,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ck_catalog_name         ON public.ck_receiving_catalog_items(name);
CREATE INDEX IF NOT EXISTS idx_ck_catalog_norm_name    ON public.ck_receiving_catalog_items(normalized_name);
CREATE INDEX IF NOT EXISTS idx_ck_catalog_category     ON public.ck_receiving_catalog_items(category);
CREATE INDEX IF NOT EXISTS idx_ck_catalog_is_active    ON public.ck_receiving_catalog_items(is_active);

-- Trigger updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'set_ck_catalog_updated_at'
    ) THEN
        CREATE TRIGGER set_ck_catalog_updated_at
            BEFORE UPDATE ON public.ck_receiving_catalog_items
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;

-- 3. Adicionar campo receiving_catalog_item_id em ck_receiving_items (idempotente)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'ck_receiving_items'
          AND column_name  = 'receiving_catalog_item_id'
    ) THEN
        ALTER TABLE public.ck_receiving_items
            ADD COLUMN receiving_catalog_item_id UUID;
    END IF;
END $$;
