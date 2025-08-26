-- Update inventory_stock table to support decimal quantities
ALTER TABLE inventory_stock 
ALTER COLUMN stock_quantity TYPE NUMERIC;

-- Update any other quantity-related columns to support decimals
ALTER TABLE inventory_stock 
ALTER COLUMN minimum_threshold TYPE NUMERIC;

ALTER TABLE inventory_stock 
ALTER COLUMN maximum_capacity TYPE NUMERIC;

-- Update inventory_transactions table to support decimal quantities
ALTER TABLE inventory_transactions 
ALTER COLUMN quantity TYPE NUMERIC;

ALTER TABLE inventory_transactions 
ALTER COLUMN previous_quantity TYPE NUMERIC;

ALTER TABLE inventory_transactions 
ALTER COLUMN new_quantity TYPE NUMERIC;

-- Add comment to document the change
COMMENT ON COLUMN inventory_stock.stock_quantity IS 'Stock quantity supporting decimal values (e.g., 12.5 kg, 3.25 liters)';
COMMENT ON COLUMN inventory_stock.minimum_threshold IS 'Minimum threshold supporting decimal values';
COMMENT ON COLUMN inventory_stock.maximum_capacity IS 'Maximum capacity supporting decimal values';
COMMENT ON COLUMN inventory_transactions.quantity IS 'Transaction quantity supporting decimal values';
COMMENT ON COLUMN inventory_transactions.previous_quantity IS 'Previous quantity supporting decimal values';
COMMENT ON COLUMN inventory_transactions.new_quantity IS 'New quantity supporting decimal values';