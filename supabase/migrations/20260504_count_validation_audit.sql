-- Migration: Auditoria e Validação de Contagem (Versão Final)
-- Foco: Idempotência, Segurança Gerencial e Integridade de Dados

-- 1. Preparar campos em count_sessions
ALTER TABLE public.count_sessions 
ADD COLUMN IF NOT EXISTS validation_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS validated_by uuid REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS validated_at timestamptz;

-- 1.1 Adicionar constraint de status de validação (idempotente)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'count_sessions_validation_status_check') THEN
        ALTER TABLE public.count_sessions 
        ADD CONSTRAINT count_sessions_validation_status_check 
        CHECK (validation_status IN ('pending', 'validated', 'corrected'));
    END IF;
END $$;

-- 2. Preparar campos em count_session_items
ALTER TABLE public.count_session_items 
ADD COLUMN IF NOT EXISTS validated_quantity numeric(10,3),
ADD COLUMN IF NOT EXISTS validated_is_zeroed boolean,
ADD COLUMN IF NOT EXISTS validated_by uuid REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS validated_at timestamptz,
ADD COLUMN IF NOT EXISTS validation_reason text,
ADD COLUMN IF NOT EXISTS validation_notes text;

-- 3. Criar tabela de Auditoria de Correções (Estrutura Rígida)
CREATE TABLE IF NOT EXISTS public.count_item_corrections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.count_sessions(id) ON DELETE CASCADE,
    item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    old_counted_quantity numeric(10,3),
    old_is_zeroed boolean,
    new_validated_quantity numeric(10,3),
    new_validated_is_zeroed boolean,
    corrected_by uuid NOT NULL REFERENCES public.users(id),
    correction_reason text NOT NULL,
    correction_notes text,
    created_at timestamptz DEFAULT now()
);

-- 4. Criar Índices de Performance
CREATE INDEX IF NOT EXISTS idx_count_corrections_session ON public.count_item_corrections(session_id);
CREATE INDEX IF NOT EXISTS idx_count_corrections_item ON public.count_item_corrections(item_id);
CREATE INDEX IF NOT EXISTS idx_count_corrections_user ON public.count_item_corrections(corrected_by);
CREATE INDEX IF NOT EXISTS idx_count_corrections_date ON public.count_item_corrections(created_at DESC);

-- 5. Segurança RLS (Somente Admin e Manager)
ALTER TABLE public.count_item_corrections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers and Admins can view corrections" ON public.count_item_corrections;
DROP POLICY IF EXISTS "Managers and Admins can insert corrections" ON public.count_item_corrections;

-- Política de Visualização: Restrita a Gerência
CREATE POLICY "Managers and Admins can view corrections" 
ON public.count_item_corrections FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
);

-- Política de Inserção: Restrita a Gerência
CREATE POLICY "Managers and Admins can insert corrections" 
ON public.count_item_corrections FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
);
