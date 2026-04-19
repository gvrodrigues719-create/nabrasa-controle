-- Migration: Add Primary Area Responsibility to Users
-- Objective: Establish a formal link between collaborators and their primary operational sector.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS primary_group_id UUID REFERENCES public.groups(id);

-- Performance Index
CREATE INDEX IF NOT EXISTS idx_users_primary_group_id ON public.users(primary_group_id);

-- Demo Data Update: Assign all existing users to a primary area for demonstration.
-- This ensures 'Sua Área Hoje' loads real data immediately after migration.
DO $$
DECLARE
    v_group_id UUID;
BEGIN
    -- Try to find the 'Cozinha' group first
    SELECT id INTO v_group_id FROM public.groups WHERE id = '91919191-9191-4919-9191-919191919191';
    
    -- Fallback to the first available group if Cozinha doesn't exist
    IF v_group_id IS NULL THEN
        SELECT id INTO v_group_id FROM public.groups LIMIT 1;
    END IF;
    
    -- Update users
    IF v_group_id IS NOT NULL THEN
        UPDATE public.users SET primary_group_id = v_group_id WHERE primary_group_id IS NULL;
    END IF;
END $$;
