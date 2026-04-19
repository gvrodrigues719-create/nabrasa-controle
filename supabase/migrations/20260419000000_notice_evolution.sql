-- Evolution of Operational Communication: Reactions and Responses for Notices

-- Table: notice_reactions
CREATE TABLE IF NOT EXISTS public.notice_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notice_id UUID NOT NULL REFERENCES public.operational_notices(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL CHECK (emoji IN ('👍', '✅', '👀', '🙌', '🔥')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(notice_id, user_id, emoji)
);

-- Table: notice_responses
CREATE TABLE IF NOT EXISTS public.notice_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notice_id UUID NOT NULL REFERENCES public.operational_notices(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_notice_reactions_notice_id ON public.notice_reactions(notice_id);
CREATE INDEX IF NOT EXISTS idx_notice_responses_notice_id ON public.notice_responses(notice_id);

-- RLS
ALTER TABLE public.notice_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notice_responses ENABLE ROW LEVEL SECURITY;

-- Reactions Policies
DROP POLICY IF EXISTS "Reactions are viewable by all authenticated users" ON public.notice_reactions;
CREATE POLICY "Reactions are viewable by all authenticated users" ON public.notice_reactions
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can manage their own reactions" ON public.notice_reactions;
CREATE POLICY "Users can manage their own reactions" ON public.notice_reactions
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Responses Policies
DROP POLICY IF EXISTS "Responses are viewable by all authenticated users" ON public.notice_responses;
CREATE POLICY "Responses are viewable by all authenticated users" ON public.notice_responses
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert their own responses" ON public.notice_responses;
CREATE POLICY "Users can insert their own responses" ON public.notice_responses
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
