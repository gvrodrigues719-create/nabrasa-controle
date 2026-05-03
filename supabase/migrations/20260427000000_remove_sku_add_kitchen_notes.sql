-- Remove sku and gtin from purchase_items
ALTER TABLE purchase_items DROP COLUMN IF EXISTS sku;
ALTER TABLE purchase_items DROP COLUMN IF EXISTS gtin;

-- Add kitchen_notes to purchase_orders
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS kitchen_notes text;
