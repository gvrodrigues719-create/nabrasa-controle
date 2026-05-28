-- Migration to support multiple store units
-- Adds unit_id to groups and routines, and backfills Camboinhas

ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.groups(id) ON DELETE SET NULL;
ALTER TABLE public.routines ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.groups(id) ON DELETE SET NULL;

-- 1. Backfill groups for Camboinhas
-- Any group that is not Cozinha Central and not a unit itself belongs to Camboinhas
UPDATE public.groups
SET unit_id = '3e52d6b2-755d-4bc5-a808-b8ac37ffcee1'
WHERE (macro_sector != 'Cozinha Central' OR macro_sector IS NULL) 
  AND type IS DISTINCT FROM 'unit'
  AND id != '3e52d6b2-755d-4bc5-a808-b8ac37ffcee1'; -- Ignore the unit itself just in case

-- 2. Backfill routines for Camboinhas
-- A routine belongs to Camboinhas if it has groups that belong to Camboinhas
UPDATE public.routines
SET unit_id = '3e52d6b2-755d-4bc5-a808-b8ac37ffcee1'
WHERE id IN (
  SELECT DISTINCT r.id 
  FROM public.routines r
  JOIN public.routine_groups rg ON rg.routine_id = r.id
  JOIN public.groups g ON g.id = rg.group_id
  WHERE g.unit_id = '3e52d6b2-755d-4bc5-a808-b8ac37ffcee1'
);

-- Force "Inventário Geral NaBrasa" to Camboinhas if it has no groups yet but shouldn't leak
UPDATE public.routines
SET unit_id = '3e52d6b2-755d-4bc5-a808-b8ac37ffcee1'
WHERE name = 'Inventário Geral NaBrasa' AND unit_id IS NULL;
