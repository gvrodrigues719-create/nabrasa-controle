-- Migração para remover sku/gtin e adicionar observação da cozinha central
ALTER TABLE purchase_items DROP COLUMN IF EXISTS sku;
ALTER TABLE purchase_items DROP COLUMN IF EXISTS gtin;

ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS kitchen_notes TEXT;
