
-- Add item_price and item_quantity columns to commissary_inventory table
ALTER TABLE commissary_inventory 
ADD COLUMN item_price NUMERIC,
ADD COLUMN item_quantity NUMERIC;

-- Add comments to document the purpose of these columns
COMMENT ON COLUMN commissary_inventory.item_price IS 'Price per individual item (e.g., price per croissant when sold individually)';
COMMENT ON COLUMN commissary_inventory.item_quantity IS 'Number of individual items per unit (e.g., 12 croissants per box)';
