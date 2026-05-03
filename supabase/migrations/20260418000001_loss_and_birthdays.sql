-- Add evidence_url to inventory_losses
ALTER TABLE public.inventory_losses ADD COLUMN IF NOT EXISTS evidence_url TEXT;

-- Add birth_day and birth_month to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS birth_day INT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS birth_month INT;

-- Comments for clarity
COMMENT ON COLUMN public.inventory_losses.evidence_url IS 'URL da foto da perda capturada via câmera.';
COMMENT ON COLUMN public.users.birth_day IS 'Dia do aniversário do colaborador.';
COMMENT ON COLUMN public.users.birth_month IS 'Mês do aniversário do colaborador.';
