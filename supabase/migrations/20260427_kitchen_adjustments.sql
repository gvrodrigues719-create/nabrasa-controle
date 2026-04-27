-- Migração para remover sku/gtin
ALTER TABLE purchase_items DROP COLUMN IF EXISTS sku;
ALTER TABLE purchase_items DROP COLUMN IF EXISTS gtin;
