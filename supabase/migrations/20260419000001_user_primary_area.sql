-- Migration: Add Primary Area Responsibility to Users
-- Objective: Establish a formal link between collaborators and their primary operational sector.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS primary_group_id UUID REFERENCES public.groups(id);

-- Performance Index
CREATE INDEX IF NOT EXISTS idx_users_primary_group_id ON public.users(primary_group_id);

-- Demo Data Update: Assign all existing users to a primary area for demonstration.
-- This ensures 'Sua Área Hoje' loads real data immediately after migration.
UPDATE public.users 
SET primary_group_id = COALESCE(
    (SELECT id FROM public.groups WHERE id = '91919191-9191-4919-9191-919191919191'),
    (SELECT id FROM public.groups LIMIT 1)
)
WHERE primary_group_id IS NULL;
