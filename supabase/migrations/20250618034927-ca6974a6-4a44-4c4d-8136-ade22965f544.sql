
-- Check the current constraint on commissary_inventory category column
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'commissary_inventory'::regclass 
AND contype = 'c';

-- Drop the existing check constraint if it exists
ALTER TABLE commissary_inventory DROP CONSTRAINT IF EXISTS commissary_inventory_category_check;

-- Add the correct check constraint that matches the TypeScript types
ALTER TABLE commissary_inventory 
ADD CONSTRAINT commissary_inventory_category_check 
CHECK (category IN ('raw_materials', 'packaging_materials', 'supplies'));

-- Also ensure the unit constraint is correct
ALTER TABLE commissary_inventory DROP CONSTRAINT IF EXISTS commissary_inventory_unit_check;

ALTER TABLE commissary_inventory 
ADD CONSTRAINT commissary_inventory_unit_check 
CHECK (unit IN ('kg', 'g', 'pieces', 'liters', 'ml', 'boxes', 'packs', 'serving', 'portion', 'scoop', 'pair'));
