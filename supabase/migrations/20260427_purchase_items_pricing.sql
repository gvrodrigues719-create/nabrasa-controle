-- 20260427_purchase_items_pricing.sql
-- Add pricing and product code fields for Purchase Module

-- 1. purchase_items
ALTER TABLE purchase_items
ADD COLUMN IF NOT EXISTS sku text,
ADD COLUMN IF NOT EXISTS gtin text,
ADD COLUMN IF NOT EXISTS default_unit_price numeric(12,2);

-- 2. purchase_order_items
ALTER TABLE purchase_order_items
ADD COLUMN IF NOT EXISTS unit_price numeric(12,2),
ADD COLUMN IF NOT EXISTS price_source text DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS price_updated_by uuid REFERENCES users(id),
ADD COLUMN IF NOT EXISTS price_updated_at timestamptz;
