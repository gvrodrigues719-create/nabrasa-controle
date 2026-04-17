-- Job 2: Inventory Losses Table
-- Objective: Allow operators to manually report losses and breakages.

CREATE TABLE IF NOT EXISTS public.inventory_losses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    category TEXT NOT NULL CHECK (category IN ('quebra', 'estragado', 'preparo', 'vencido', 'outro')),
    observation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_inventory_losses_item_id ON public.inventory_losses(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_losses_user_id ON public.inventory_losses(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_losses_created_at ON public.inventory_losses(created_at);

-- RLS (Row Level Security)
ALTER TABLE public.inventory_losses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Losses are viewable by authenticated users" ON public.inventory_losses
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Operators can insert their own reports" ON public.inventory_losses
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager')));

-- Grant permissions
GRANT ALL ON public.inventory_losses TO postgres;
GRANT ALL ON public.inventory_losses TO authenticated;
GRANT ALL ON public.inventory_losses TO service_role;
