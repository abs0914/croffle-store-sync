-- Remove unique constraint on name to allow same items in different locations
ALTER TABLE commissary_inventory 
DROP CONSTRAINT IF EXISTS commissary_inventory_name_unique;

-- Add unique constraint on SKU instead (SKUs should be globally unique)
ALTER TABLE commissary_inventory 
ADD CONSTRAINT commissary_inventory_sku_unique UNIQUE (sku);

-- Note: This allows null SKUs but if an SKU is provided, it must be unique