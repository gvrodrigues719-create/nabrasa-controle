-- ============================================================
-- Migration: item_type em purchase_items
-- Objetivo: separar itens produzidos x separados/comprados
-- ============================================================

-- 1. Criar coluna
ALTER TABLE public.purchase_items
ADD COLUMN IF NOT EXISTS item_type VARCHAR DEFAULT 'unclassified';

-- 2. Garantir default
ALTER TABLE public.purchase_items
ALTER COLUMN item_type SET DEFAULT 'unclassified';

-- 3. Garantir que nulos/inválidos virem unclassified ANTES do check
UPDATE public.purchase_items
SET item_type = 'unclassified'
WHERE item_type IS NULL
   OR item_type NOT IN ('produced', 'separated', 'unclassified');

-- 4. Criar CHECK constraint idempotente
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'purchase_items_item_type_check'
        AND conrelid = 'public.purchase_items'::regclass
    ) THEN
        ALTER TABLE public.purchase_items
        ADD CONSTRAINT purchase_items_item_type_check
        CHECK (item_type IN ('produced', 'separated', 'unclassified'));
    END IF;
END $$;

-- 5. Marcar itens claramente produzidos
UPDATE public.purchase_items
SET item_type = 'produced'
WHERE category ILIKE '%ESPETOS%'
   OR category ILIKE '%COZINHA CENTRAL - BASES%'
   OR category ILIKE '%COZINHA CENTRAL - MOLHOS%'
   OR category ILIKE '%CARNES PORÇÕES%'
   OR category ILIKE '%PORÇÕES%';

-- 6. Forçar itens separados por categoria
UPDATE public.purchase_items
SET item_type = 'separated'
WHERE category ILIKE '%DESCARTÁVEIS%'
   OR category ILIKE '%LIMPEZA%'
   OR category ILIKE '%INSUMOS OPERACIONAIS%'
   OR category ILIKE '%LATICÍNIOS E OVOS%'
   OR category ILIKE '%MERCEARIA%'
   OR category ILIKE '%BEBIDAS%';

-- 7. Forçar itens separados por nome
-- Esta regra vem por último de propósito.
UPDATE public.purchase_items
SET item_type = 'separated'
WHERE name ILIKE '%BOBINA%'
   OR name ILIKE '%POTE%'
   OR name ILIKE '%SACO%'
   OR name ILIKE '%DESCART%'
   OR name ILIKE '%EMBALAGEM%'
   OR name ILIKE '%ÁLCOOL%'
   OR name ILIKE '%ALCOOL%'
   OR name ILIKE '%ASSA RÁPIDO%'
   OR name ILIKE '%ASSA RAPIDO%'
   OR name ILIKE '%ETIQUETA%'
   OR name ILIKE '%RIBBON%'
   OR name ILIKE '%PAPEL ALUMÍNIO%'
   OR name ILIKE '%PAPEL ALUMINIO%'
   OR name ILIKE '%HIPOCLORITO%'
   OR name ILIKE '%GUARDANAPO%'
   OR name ILIKE '%SALADEIRA%'
   OR name ILIKE '%TOUCA%'
   OR name ILIKE '%TALHER%';
