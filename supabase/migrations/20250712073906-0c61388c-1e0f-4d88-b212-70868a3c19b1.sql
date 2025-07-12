-- Remove markup fields and keep only one price field
ALTER TABLE recipe_templates 
DROP COLUMN IF EXISTS base_price,
DROP COLUMN IF EXISTS suggested_markup_percentage,
RENAME COLUMN pos_price TO price;