-- =========================================================================================
-- Migration: Criação do Módulo de Recebimentos da Cozinha Central
-- Descrição: Tabelas independentes para registrar agenda operacional de entregas.
--            NÃO afeta estoque nesta fase.
-- =========================================================================================

-- 1. Tabela Principal de Recebimentos (Cabeçalho)
CREATE TABLE IF NOT EXISTS public.ck_receivings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    supplier_name TEXT,
    delivery_date DATE NOT NULL,
    delivery_period TEXT, -- manha, tarde, noite, horario_especifico
    delivery_time TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, delivered, partial, refused, canceled
    priority TEXT, -- normal, alta
    notes TEXT,
    destination_location_id UUID,
    created_by UUID NOT NULL,
    received_by UUID,
    received_at TIMESTAMPTZ,
    reception_notes TEXT,
    refusal_reason TEXT,
    canceled_by UUID,
    canceled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices de performance (idempotentes)
CREATE INDEX IF NOT EXISTS idx_ck_receivings_delivery_date ON public.ck_receivings(delivery_date);
CREATE INDEX IF NOT EXISTS idx_ck_receivings_status ON public.ck_receivings(status);
CREATE INDEX IF NOT EXISTS idx_ck_receivings_supplier_name ON public.ck_receivings(supplier_name);

-- 2. Tabela de Itens do Recebimento
CREATE TABLE IF NOT EXISTS public.ck_receiving_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receiving_id UUID NOT NULL REFERENCES public.ck_receivings(id) ON DELETE CASCADE,
    purchase_item_id UUID, -- Opcional, pode ser texto livre
    item_name TEXT NOT NULL,
    expected_qty NUMERIC,
    received_qty NUMERIC,
    unit TEXT,
    item_status TEXT DEFAULT 'pending', -- pending, received, partial, not_delivered, refused
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice de performance para itens
CREATE INDEX IF NOT EXISTS idx_ck_receiving_items_receiving_id ON public.ck_receiving_items(receiving_id);

-- 3. Tabela de Eventos / Auditoria do Recebimento
CREATE TABLE IF NOT EXISTS public.ck_receiving_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receiving_id UUID NOT NULL REFERENCES public.ck_receivings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    event_type TEXT NOT NULL, -- created, updated, marked_delivered, marked_partial, marked_refused, canceled
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice de performance para eventos
CREATE INDEX IF NOT EXISTS idx_ck_receiving_events_receiving_id ON public.ck_receiving_events(receiving_id);

-- 4. Função e Trigger de Atualização de `updated_at` para `ck_receivings`
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_ck_receivings_updated_at'
    ) THEN
        CREATE TRIGGER set_ck_receivings_updated_at
            BEFORE UPDATE ON public.ck_receivings
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;

-- 5. Função e Trigger de Atualização de `updated_at` para `ck_receiving_items`
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_ck_receiving_items_updated_at'
    ) THEN
        CREATE TRIGGER set_ck_receiving_items_updated_at
            BEFORE UPDATE ON public.ck_receiving_items
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;
