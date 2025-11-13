-- Add item_name column to purchase_order_items table for reliable display
ALTER TABLE purchase_order_items 
ADD COLUMN IF NOT EXISTS item_name TEXT;

-- Make inventory_stock_id nullable since it might not exist due to race conditions
ALTER TABLE purchase_order_items 
ALTER COLUMN inventory_stock_id DROP NOT NULL;

-- Add index on item_name for better query performance
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_item_name 
ON purchase_order_items(item_name);