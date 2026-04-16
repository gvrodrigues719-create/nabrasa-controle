-- Job 6: Checklist Engine Database Modeling (Revised v2)
-- Objective: Create the database structure for the Checklist module with refined constraints and RLS.

-- 1. Checklist Templates
CREATE TABLE IF NOT EXISTS public.checklist_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    context TEXT NOT NULL CHECK (context IN ('opening', 'closing', 'daily', 'receiving', 'custom')),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Checklist Template Items
CREATE TABLE IF NOT EXISTS public.checklist_template_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
    section_name TEXT,
    label TEXT NOT NULL,
    description TEXT,
    response_type TEXT NOT NULL CHECK (response_type IN ('boolean', 'number', 'text', 'choice', 'temperature')),
    required BOOLEAN NOT NULL DEFAULT true,
    evidence_required BOOLEAN NOT NULL DEFAULT false,
    options JSONB, -- For 'choice' type: array of strings
    display_order INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(template_id, display_order)
);

-- 3. Checklist Sessions
CREATE TABLE IF NOT EXISTS public.checklist_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
    routine_id UUID REFERENCES public.routines(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.users(id),
    group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'canceled')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Checklist Session Items (Responses)
CREATE TABLE IF NOT EXISTS public.checklist_session_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.checklist_sessions(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.checklist_template_items(id) ON DELETE CASCADE,
    value JSONB,
    observation TEXT,
    evidence_url TEXT,
    is_na BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, item_id)
);

-- Indices for performance and tracking
CREATE INDEX IF NOT EXISTS idx_checklist_sessions_user_id ON public.checklist_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_checklist_sessions_routine_id ON public.checklist_sessions(routine_id);
CREATE INDEX IF NOT EXISTS idx_checklist_sessions_group_id ON public.checklist_sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_checklist_sessions_template_id ON public.checklist_sessions(template_id);
CREATE INDEX IF NOT EXISTS idx_checklist_sessions_status ON public.checklist_sessions(status);
CREATE INDEX IF NOT EXISTS idx_checklist_session_items_session_id ON public.checklist_session_items(session_id);
CREATE INDEX IF NOT EXISTS idx_checklist_session_items_item_id ON public.checklist_session_items(item_id);

-- Compound Indices
CREATE INDEX IF NOT EXISTS idx_checklist_sessions_template_status ON public.checklist_sessions(template_id, status);
CREATE INDEX IF NOT EXISTS idx_checklist_sessions_user_status ON public.checklist_sessions(user_id, status);

-- RLS (Row Level Security)
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_session_items ENABLE ROW LEVEL SECURITY;

-- 1. checklist_templates policies
CREATE POLICY "Templates are viewable by authenticated users" ON public.checklist_templates
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Templates can be managed by admin/manager" ON public.checklist_templates
    FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager')));

-- 2. checklist_template_items policies
CREATE POLICY "Template items are viewable by authenticated users" ON public.checklist_template_items
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Template items can be managed by admin/manager" ON public.checklist_template_items
    FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager')));

-- 3. checklist_sessions policies
CREATE POLICY "Users can view their own sessions or if admin/manager" ON public.checklist_sessions
    FOR SELECT TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager')));

CREATE POLICY "Users can insert their own sessions or if admin/manager" ON public.checklist_sessions
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager')));

CREATE POLICY "Users can update their own sessions or if admin/manager" ON public.checklist_sessions
    FOR UPDATE TO authenticated 
    USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager')))
    WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager')));

-- 4. checklist_session_items policies
CREATE POLICY "Users can view session items of their sessions or if admin/manager" ON public.checklist_session_items
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.checklist_sessions WHERE id = session_id AND user_id = auth.uid()) 
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))
    );

CREATE POLICY "Users can insert session items of their sessions or if admin/manager" ON public.checklist_session_items
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM public.checklist_sessions WHERE id = session_id AND (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))))
    );

CREATE POLICY "Users can update session items of their sessions or if admin/manager" ON public.checklist_session_items
    FOR UPDATE TO authenticated 
    USING (
        EXISTS (SELECT 1 FROM public.checklist_sessions WHERE id = session_id AND user_id = auth.uid()) 
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.checklist_sessions WHERE id = session_id AND (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))))
    );
