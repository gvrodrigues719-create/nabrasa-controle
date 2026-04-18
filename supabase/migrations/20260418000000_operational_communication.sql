-- Implementation of Operational Communication Layer
-- 1. Mural da Casa (Notices)
-- 2. Contextual Task Comments

-- Table: operational_notices
CREATE TABLE IF NOT EXISTS public.operational_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('operacional', 'item_em_falta', 'promocao', 'mudanca_de_turno', 'comunicado_geral')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'importante', 'urgente')),
    valid_until TIMESTAMPTZ,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: task_comments
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_type TEXT NOT NULL CHECK (reference_type IN ('session', 'routine', 'task')),
    reference_id UUID NOT NULL, -- UUID of the target session/routine
    user_id UUID NOT NULL REFERENCES public.users(id),
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'resposta' CHECK (type IN ('cobranca', 'orientacao', 'duvida', 'justificativa', 'resposta')),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_operational_notices_priority ON public.operational_notices(priority);
CREATE INDEX IF NOT EXISTS idx_operational_notices_valid_until ON public.operational_notices(valid_until);
CREATE INDEX IF NOT EXISTS idx_task_comments_reference_id ON public.task_comments(reference_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_type ON public.task_comments(type);

-- RLS
ALTER TABLE public.operational_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Notices Policies
DROP POLICY IF EXISTS "Notices are viewable by all authenticated users" ON public.operational_notices;
CREATE POLICY "Notices are viewable by all authenticated users" ON public.operational_notices
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Notices can be managed by managers/admins" ON public.operational_notices;
CREATE POLICY "Notices can be managed by managers/admins" ON public.operational_notices
    FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager')));

-- Comments Policies
DROP POLICY IF EXISTS "Comments are viewable by all authenticated users" ON public.task_comments;
CREATE POLICY "Comments are viewable by all authenticated users" ON public.task_comments
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Comments can be inserted by authenticated users" ON public.task_comments;
CREATE POLICY "Comments can be inserted by authenticated users" ON public.task_comments
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Managers can mark comments as resolved" ON public.task_comments;
CREATE POLICY "Managers can mark comments as resolved" ON public.task_comments
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager')));
