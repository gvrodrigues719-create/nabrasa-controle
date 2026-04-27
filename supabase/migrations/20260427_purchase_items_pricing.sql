-- 20260427_purchase_items_pricing.sql
-- Add pricing and product code fields for Purchase Module

-- 1. purchase_items
ALTER TABLE purchase_items
ADD COLUMN sku text,
ADD COLUMN gtin text,
ADD COLUMN default_unit_price numeric(12,2);

-- 2. purchase_order_items
ALTER TABLE purchase_order_items
ADD COLUMN unit_price numeric(12,2),
ADD COLUMN price_source text DEFAULT 'manual',
ADD COLUMN price_updated_by uuid REFERENCES users(id),
ADD COLUMN price_updated_at timestamptz;
