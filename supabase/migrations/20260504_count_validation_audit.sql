-- Migration: Auditoria e Validação de Contagem
-- Adiciona campos de validação e tabela de histórico de correções

-- 1. Campos em count_sessions
ALTER TABLE public.count_sessions 
ADD COLUMN IF NOT EXISTS validation_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS validated_by uuid REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS validated_at timestamptz;

-- 2. Campos em count_session_items
ALTER TABLE public.count_session_items 
ADD COLUMN IF NOT EXISTS validated_quantity numeric(10,3),
ADD COLUMN IF NOT EXISTS validated_is_zeroed boolean,
ADD COLUMN IF NOT EXISTS validated_by uuid REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS validated_at timestamptz,
ADD COLUMN IF NOT EXISTS validation_reason text,
ADD COLUMN IF NOT EXISTS validation_notes text;

-- 3. Tabela de Auditoria de Correções
CREATE TABLE IF NOT EXISTS public.count_item_corrections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid REFERENCES public.count_sessions(id) ON DELETE CASCADE,
    item_id uuid REFERENCES public.items(id) ON DELETE CASCADE,
    old_counted_quantity numeric(10,3),
    old_is_zeroed boolean,
    new_validated_quantity numeric(10,3),
    new_validated_is_zeroed boolean,
    corrected_by uuid REFERENCES public.users(id),
    correction_reason text NOT NULL,
    correction_notes text,
    created_at timestamptz DEFAULT now()
);

-- 4. RLS para auditoria
ALTER TABLE public.count_item_corrections ENABLE ROW LEVEL SECURITY;

-- Drop existing if exists to be safe
DROP POLICY IF EXISTS "Managers and Admins can view corrections" ON public.count_item_corrections;
DROP POLICY IF EXISTS "Managers and Admins can insert corrections" ON public.count_item_corrections;

CREATE POLICY "Managers and Admins can view corrections" 
ON public.count_item_corrections FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role IN ('admin', 'manager', 'operador') -- Let operators see for history
    )
);

CREATE POLICY "Managers and Admins can insert corrections" 
ON public.count_item_corrections FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
);
