-- Job 1: Checklist Integration into MOC Core
-- Objective: Unify checklist and counting under the 'routines' structural contract.

-- 1. Extend routines table to support checklist templates
ALTER TABLE public.routines 
ADD COLUMN IF NOT EXISTS checklist_template_id UUID REFERENCES public.checklist_templates(id) ON DELETE SET NULL;

-- 2. Update routine_type constraint if necessary (Check if it's already generic or specific)
-- Note: 'count' is already used. Let's ensure 'checklist' is a first-class citizen.
DO $$ 
BEGIN 
    ALTER TABLE public.routines DROP CONSTRAINT IF EXISTS routines_routine_type_check;
    ALTER TABLE public.routines ADD CONSTRAINT routines_routine_type_check CHECK (routine_type IN ('count', 'checklist', 'procedural'));
END $$;

-- 3. Unify Execution tracking
-- Add execution_id to checklist_sessions to match count_sessions pattern
-- This allows grouping multiple checklists and counts under the same "Operational Event"
ALTER TABLE public.checklist_sessions
ADD COLUMN IF NOT EXISTS execution_id UUID REFERENCES public.routine_executions(id) ON DELETE CASCADE;

-- 4. Indices for unified dashboard performance
CREATE INDEX IF NOT EXISTS idx_routines_template_id ON public.routines(checklist_template_id);
CREATE INDEX IF NOT EXISTS idx_checklist_sessions_execution_id ON public.checklist_sessions(execution_id);

-- 5. Comments for Documentation
COMMENT ON COLUMN public.routines.checklist_template_id IS 'Link to the checklist definition if routine_type is checklist';
COMMENT ON COLUMN public.checklist_sessions.execution_id IS 'Links the checklist session to an operational execution cycle (e.g., Today s shift)';
