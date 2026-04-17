-- Criação da tabela para o Foco da Semana Real
CREATE TABLE IF NOT EXISTS public.weekly_focus (
    week_start DATE PRIMARY KEY,
    title TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('suggested', 'manual')),
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE public.weekly_focus ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- Todo mundo autenticado pode ler
CREATE POLICY "weekly_focus_read_all" ON public.weekly_focus
  FOR SELECT USING (auth.role() = 'authenticated');

-- Apenas admins/managers podem inserir/atualizar ou o service_role via system
CREATE POLICY "weekly_focus_write_admin" ON public.weekly_focus
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('admin', 'manager')
    )
  );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.set_weekly_focus_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_weekly_focus_updated_at ON public.weekly_focus;
CREATE TRIGGER trg_weekly_focus_updated_at
BEFORE UPDATE ON public.weekly_focus
FOR EACH ROW
EXECUTE FUNCTION public.set_weekly_focus_updated_at();
