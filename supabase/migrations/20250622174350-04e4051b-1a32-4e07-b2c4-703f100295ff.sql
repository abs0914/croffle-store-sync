
-- Add item_type column to commissary_inventory table
ALTER TABLE commissary_inventory 
ADD COLUMN item_type TEXT NOT NULL DEFAULT 'raw_material' 
CHECK (item_type IN ('raw_material', 'supply', 'orderable_item'));

-- Update existing records to set appropriate item_type based on category
UPDATE commissary_inventory 
SET item_type = CASE 
  WHEN category = 'raw_materials' THEN 'raw_material'
  WHEN category = 'packaging_materials' THEN 'supply'
  WHEN category = 'supplies' THEN 'supply'
  ELSE 'raw_material'
END;

-- Add index for better performance on item_type queries
CREATE INDEX idx_commissary_inventory_item_type ON commissary_inventory(item_type);
