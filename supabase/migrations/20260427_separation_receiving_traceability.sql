-- Rastreabilidade de Separação e Recebimento
-- Adiciona campos separation_notes e received_notes nos itens do pedido
-- Os campos notes (legado) são mantidos para não quebrar dados antigos

ALTER TABLE purchase_order_items
ADD COLUMN IF NOT EXISTS separation_notes text;

ALTER TABLE purchase_order_items
ADD COLUMN IF NOT EXISTS received_notes text;
