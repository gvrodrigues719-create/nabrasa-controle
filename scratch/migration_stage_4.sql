-- Etapa 4: Processamento Operacional e Rastreabilidade
-- Módulo NaBrasa Controle

-- 1. Atualizar Itens com campos de classificação gerencial
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS cost_category TEXT,
ADD COLUMN IF NOT EXISTS affects_cmv BOOLEAN,
ADD COLUMN IF NOT EXISTS affects_average_cost BOOLEAN;

-- 2. Atualizar Notas com campos de processamento
ALTER TABLE public.supplier_invoices
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES public.users(id);

-- 3. Atualizar stock_entries para rastreabilidade com a linha da nota
ALTER TABLE public.stock_entries
ADD COLUMN IF NOT EXISTS supplier_invoice_item_id UUID REFERENCES public.supplier_invoice_items(id) ON DELETE SET NULL;

-- 4. Comentários para documentação rápida
COMMENT ON COLUMN public.items.cost_category IS 'Categoria gerencial (cmv, embalagem, limpeza, etc)';
COMMENT ON COLUMN public.items.affects_cmv IS 'Define se o item entra no cálculo do CMV real';
COMMENT ON COLUMN public.items.affects_average_cost IS 'Define se a compra deste item atualiza o custo médio no cadastro';
COMMENT ON COLUMN public.stock_entries.supplier_invoice_item_id IS 'Link de origem: linha da nota fiscal importada';
