
-- Remove supplier_id column from purchase_orders table since admin fulfills orders internally
ALTER TABLE purchase_orders 
DROP COLUMN IF EXISTS supplier_id;

-- Update any existing purchase orders to ensure they don't have dangling references
-- (This is handled by the DROP COLUMN above, but we'll add a comment for clarity)
-- The order management system is now purely internal: store requests → admin fulfillment
