-- Migration: Monthly Gamification Score and Ranking
-- Description: Create a table for monthly user score snapshots to support fair ranking by percentage.

CREATE TABLE IF NOT EXISTS public.monthly_user_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month_ref TEXT NOT NULL, -- Format: YYYY-MM
    track_type TEXT NOT NULL, -- 'cozinha', 'salao', 'lideranca'
    points_earned INTEGER NOT NULL DEFAULT 0,
    points_available INTEGER NOT NULL DEFAULT 0,
    score_percentage DECIMAL(5,2) NOT NULL DEFAULT 0, -- Score = earned / available * 100
    consistency_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    participation_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    highlight_score DECIMAL(5,2) NOT NULL DEFAULT 0, -- 70% score + 20% consistency + 10% participation
    rank_position INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Idempotency: One score record per user per month
    CONSTRAINT unique_monthly_user_score UNIQUE (user_id, month_ref)
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_monthly_scores_user_id ON public.monthly_user_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_scores_month_ref ON public.monthly_user_scores(month_ref);
CREATE INDEX IF NOT EXISTS idx_monthly_scores_ranking ON public.monthly_user_scores(month_ref, score_percentage DESC);

-- RLS (Row Level Security)
ALTER TABLE public.monthly_user_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own monthly scores"
ON public.monthly_user_scores FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins and Managers can view all monthly scores"
ON public.monthly_user_scores FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
);

-- Comentários
COMMENT ON TABLE public.monthly_user_scores IS 'Snapshots mensais de pontuação e ranking por score para meritocracia justa.';
