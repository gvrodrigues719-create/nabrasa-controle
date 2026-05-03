-- 20260427_purchase_order_items_unique.sql
-- Fix Upsert missing unique constraint

DO $$
BEGIN
    -- remove duplicados antes de criar unique, se existirem
    WITH duplicates AS (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY order_id, item_id
                   ORDER BY created_at ASC
               ) AS rn
        FROM purchase_order_items
    )
    DELETE FROM purchase_order_items
    WHERE id IN (
        SELECT id FROM duplicates WHERE rn > 1
    );

    -- cria constraint única se ainda não existir
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'purchase_order_items_order_item_unique'
    ) THEN
        ALTER TABLE purchase_order_items
        ADD CONSTRAINT purchase_order_items_order_item_unique
        UNIQUE (order_id, item_id);
    END IF;
END $$;
