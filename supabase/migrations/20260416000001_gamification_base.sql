-- Migration: Base de Gamificação do MOC
-- Descrição: Tabela para registro de eventos operacionais e pontuação (XP)

CREATE TABLE IF NOT EXISTS public.gamification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL, -- Ex: 'count_group_completion', 'count_routine_completion'
    source_id UUID NOT NULL,   -- ID do objeto (count_session.id, execution.id, etc)
    points INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- ESTRATÉGIA DE IDEMPOTÊNCIA
    -- Impede que o mesmo gatilho gere pontos múltiplas vezes para o mesmo usuário
    CONSTRAINT unique_gamification_event UNIQUE (user_id, source_type, source_id)
);

-- Índices para performance de consultas e auditoria
CREATE INDEX IF NOT EXISTS idx_gamification_user_id ON public.gamification_events(user_id);
CREATE INDEX IF NOT EXISTS idx_gamification_source_id ON public.gamification_events(source_id);

-- Configuração de RLS (Row Level Security)
ALTER TABLE public.gamification_events ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver seus próprios pontos
CREATE POLICY "Users can view their own points"
ON public.gamification_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Política: Administradores e Gerentes podem ver todos os pontos
CREATE POLICY "Admins and Managers can view all points"
ON public.gamification_events
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
);

-- Comentários para documentação
COMMENT ON TABLE public.gamification_events IS 'Registro de eventos de gamificação e pontuação do MOC.';
COMMENT ON COLUMN public.gamification_events.source_type IS 'O tipo de evento que gerou a pontuação (gatilho).';
COMMENT ON COLUMN public.gamification_events.source_id IS 'UUID de referência no motor de origem (id da sessão, id da rotina, etc).';
