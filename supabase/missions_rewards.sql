-- ======================================================================================
-- MÓDULO MISSÕES, EVIDÊNCIAS E RECOMPENSAS (NB Coins)
-- ======================================================================================

-- 1. CATÁLOGO DE MISSÕES (Templates Básicos)
CREATE TABLE IF NOT EXISTS public.mission_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concept_key TEXT UNIQUE NOT NULL, -- ex: 'session_clean_close', 'checklist_on_time', 'weekly_focus'
    title TEXT NOT NULL,
    description TEXT,
    frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'one_shot')),
    base_points INTEGER DEFAULT 0,
    base_coins INTEGER DEFAULT 0,
    requires_evidence BOOLEAN DEFAULT FALSE,
    bonus_points INTEGER DEFAULT 0,
    bonus_coins INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. EXECUÇÃO DE MISSÕES (Trilha Relacional do Operador)
CREATE TABLE IF NOT EXISTS public.mission_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_template_id UUID NOT NULL REFERENCES public.mission_templates(id),
    user_id UUID NOT NULL REFERENCES public.users(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'awaiting_approval', 'approved', 'rejected')),
    evidence_url TEXT,
    source_id TEXT, -- ID do checklist, sessao, event, focus date (flexível para auditoria)
    points_awarded INTEGER DEFAULT 0,
    coins_awarded INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CARTEIRA E MOEDAS (Ledger)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    type TEXT NOT NULL CHECK (type IN ('earned', 'spent', 'refunded')),
    amount INTEGER NOT NULL CHECK (amount > 0),
    reference_id UUID, -- id da mission_run ou da reward_redemption
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Visão rápida para extrair saldo sem precisar somar tudo sempre do lado da app
CREATE OR REPLACE VIEW public.user_wallet_balances AS
SELECT 
    user_id,
    COALESCE(SUM(CASE WHEN type = 'earned' THEN amount ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN type = 'spent' THEN amount ELSE 0 END), 0) +
    COALESCE(SUM(CASE WHEN type = 'refunded' THEN amount ELSE 0 END), 0) as balance
FROM public.wallet_transactions
GROUP BY user_id;

-- 4. CATÁLOGO DE RECOMPENSAS
CREATE TABLE IF NOT EXISTS public.reward_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    cost_coins INTEGER NOT NULL CHECK (cost_coins > 0),
    stock INTEGER DEFAULT -1, -- -1 para infinito
    icon TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. RESGATES DE RECOMPENSAS
CREATE TABLE IF NOT EXISTS public.reward_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    reward_id UUID NOT NULL REFERENCES public.reward_catalog(id),
    status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'fulfilled', 'cancelled')),
    coins_spent INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ======================================================================================
-- SEGURANÇA BÁSICA (RLS Setup)
-- ======================================================================================
ALTER TABLE public.mission_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

-- Leitura pública aberta para usuários do sistema autenticados
CREATE POLICY "mission_read_all" ON public.mission_templates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "runs_read_all" ON public.mission_runs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "wallet_read_all" ON public.wallet_transactions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "rewards_read_all" ON public.reward_catalog FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "redemptions_read_all" ON public.reward_redemptions FOR SELECT USING (auth.role() = 'authenticated');

-- ======================================================================================
-- INSERÇÃO DE MOCKS BÁSICOS NA CRIAÇÃO (Para não subir do zero)
-- ======================================================================================
INSERT INTO public.mission_templates (concept_key, title, description, frequency, base_points, base_coins, requires_evidence, bonus_points, bonus_coins)
VALUES 
    ('checklist_on_time', 'Checklist no Prazo', 'Faça check-in e concuía a validação dentro do limite de tempo.', 'daily', 50, 20, false, 0, 0),
    ('session_clean_close', 'Sessão Perfeita', 'Feche a sessão de contagem sem nenhum abandono.', 'daily', 25, 10, false, 0, 0),
    ('routine_zero_rupture', 'Estoque Blindado', 'Conclua a rotina de checklist inteira ou setor de contagem sem ruptura.', 'daily', 75, 30, false, 0, 0),
    ('loss_report_with_photo', 'Caça Vazamento', 'Identifique e relate alguma perda nova com uma foto de evidência.', 'daily', 25, 10, true, 50, 40)
ON CONFLICT (concept_key) DO NOTHING;

INSERT INTO public.reward_catalog (title, description, cost_coins, icon, stock)
VALUES 
    ('Dia de Folga Surpresa', '1 folga agendável aprovada imediatamente.', 500, 'calendar', 10),
    ('Sessão Vip Cinema', 'Ingresso pra você e +1 com pipoca estourando.', 200, 'ticket', -1),
    ('Almoço na Faixa', 'Corte Premium do dia na faixa hoje no seu almoço.', 150, 'chef-hat', -1),
    ('Pix de Gratidão', 'Saque de 50 reais de recompensa na conta.', 300, 'banknote', -1)
ON CONFLICT DO NOTHING;
