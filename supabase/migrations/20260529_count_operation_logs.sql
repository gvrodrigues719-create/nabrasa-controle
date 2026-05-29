-- Criação da tabela de logs de erros/operações de contagem
CREATE TABLE IF NOT EXISTS public.count_operation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    routine_id UUID REFERENCES public.routines(id) ON DELETE SET NULL,
    group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
    session_id UUID REFERENCES public.count_sessions(id) ON DELETE SET NULL,
    expected_count INTEGER NOT NULL DEFAULT 0,
    saved_count INTEGER NOT NULL DEFAULT 0,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.count_operation_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Apenas admin pode ver os logs"
    ON public.count_operation_logs FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role = 'admin'
    ));

CREATE POLICY "Qualquer um pode inserir logs"
    ON public.count_operation_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);
