
-- Add "finished_goods" category to commissary inventory
-- First update the check constraint to include the new category
ALTER TABLE commissary_inventory DROP CONSTRAINT IF EXISTS commissary_inventory_category_check;

ALTER TABLE commissary_inventory 
ADD CONSTRAINT commissary_inventory_category_check 
CHECK (category IN ('raw_materials', 'packaging_materials', 'supplies', 'finished_goods'));

-- Also update the unit constraint to include the new UOMs
ALTER TABLE commissary_inventory DROP CONSTRAINT IF EXISTS commissary_inventory_unit_check;

ALTER TABLE commissary_inventory 
ADD CONSTRAINT commissary_inventory_unit_check 
CHECK (unit IN ('kg', 'g', 'pieces', 'liters', 'ml', 'boxes', 'packs', 'serving', 'portion', 'scoop', 'pair', 'Box', 'Piping Bag', 'Pack of 10', 'Pack of 20', 'Pack of 24', 'Pack of 25', 'Pack of 27', 'Pack of 32', 'Pack of 50', 'Pack of 100'));
