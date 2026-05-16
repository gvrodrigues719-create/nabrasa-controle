-- =========================================================================================
-- Migration: Criação da tabela de Comentários de Pedido
-- Data: 2026-05-16
-- Descrição: Tabela para histórico de mensagens entre Loja e Cozinha Central
-- =========================================================================================

CREATE TABLE IF NOT EXISTS public.purchase_order_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE public.purchase_order_comments ENABLE ROW LEVEL SECURITY;

-- 1. Políticas de Leitura (SELECT)
-- Admin e Cozinha veem todos os comentários
-- Usuário de loja vê os comentários dos pedidos da loja dele
CREATE POLICY "Leitura_Comentarios_Admin_Cozinha" 
ON public.purchase_order_comments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id = auth.uid() 
        AND u.role IN ('admin', 'kitchen')
    )
);

CREATE POLICY "Leitura_Comentarios_Loja" 
ON public.purchase_order_comments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.purchase_orders po
        JOIN public.users u ON u.primary_group_id = po.store_id
        WHERE po.id = purchase_order_comments.order_id
        AND u.id = auth.uid()
    )
);

-- 2. Políticas de Criação (INSERT)
-- O usuário logado deve ser o mesmo do user_id
-- E as mesmas regras de visualização se aplicam
CREATE POLICY "Criacao_Comentarios_Admin_Cozinha" 
ON public.purchase_order_comments FOR INSERT
WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id = auth.uid() 
        AND u.role IN ('admin', 'kitchen')
    )
);

CREATE POLICY "Criacao_Comentarios_Loja" 
ON public.purchase_order_comments FOR INSERT
WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.purchase_orders po
        JOIN public.users u ON u.primary_group_id = po.store_id
        WHERE po.id = purchase_order_comments.order_id
        AND u.id = auth.uid()
    )
);
