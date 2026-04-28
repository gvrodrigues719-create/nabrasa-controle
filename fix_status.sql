-- Correção de Status de Pedidos
ALTER TABLE public.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;
ALTER TABLE public.purchase_orders ADD CONSTRAINT purchase_orders_status_check 
CHECK (status IN ('rascunho', 'enviado', 'em_separacao', 'separado', 'recebido', 'cancelado'));
