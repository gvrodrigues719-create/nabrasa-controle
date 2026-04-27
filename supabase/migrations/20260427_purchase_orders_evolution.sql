-- ============================================================
-- Evolução do Módulo de Compras: Pedidos Internos e Localização
-- Migration: 20260427_purchase_orders_evolution.sql
-- ============================================================

-- Adicionar colunas necessárias para diferenciar compras de abastecimento interno
ALTER TABLE public.purchase_orders 
ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'internal_replenishment' CHECK (order_type IN ('supplier_purchase', 'internal_replenishment')),
ADD COLUMN IF NOT EXISTS source_location_id UUID REFERENCES public.groups(id),
ADD COLUMN IF NOT EXISTS destination_location_id UUID REFERENCES public.groups(id),
ADD COLUMN IF NOT EXISTS requested_for_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.users(id);

-- Migração de dados para registros existentes
UPDATE public.purchase_orders 
SET 
    destination_location_id = store_id,
    requested_by = created_by,
    order_type = 'internal_replenishment'
WHERE destination_location_id IS NULL;

-- Índices para performance em buscas por localização e data
CREATE INDEX IF NOT EXISTS idx_purchase_orders_source_loc ON public.purchase_orders(source_location_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_dest_loc   ON public.purchase_orders(destination_location_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_req_date   ON public.purchase_orders(requested_for_date);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_type       ON public.purchase_orders(order_type);
