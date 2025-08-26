
-- Make recipe_template_ingredients more flexible by removing hard dependency on commissary items
-- and adding generic ingredient fields

-- First, add new columns for generic ingredient information
ALTER TABLE recipe_template_ingredients 
ADD COLUMN ingredient_name TEXT,
ADD COLUMN ingredient_category TEXT,
ADD COLUMN ingredient_type TEXT;

-- Make commissary_item_id nullable (optional)
ALTER TABLE recipe_template_ingredients 
ALTER COLUMN commissary_item_id DROP NOT NULL;

-- Make commissary_item_name nullable too since it will be optional
ALTER TABLE recipe_template_ingredients 
ALTER COLUMN commissary_item_name DROP NOT NULL;

-- Update existing records to use commissary_item_name as ingredient_name
UPDATE recipe_template_ingredients 
SET ingredient_name = commissary_item_name,
    ingredient_category = 'ingredient',
    ingredient_type = 'raw_material'
WHERE ingredient_name IS NULL;

-- Make ingredient_name required going forward
ALTER TABLE recipe_template_ingredients 
ALTER COLUMN ingredient_name SET NOT NULL;

-- Add check constraint for ingredient_category
ALTER TABLE recipe_template_ingredients 
ADD CONSTRAINT check_ingredient_category 
CHECK (ingredient_category IN ('ingredient', 'spice', 'sauce', 'topping', 'base', 'packaging'));

-- Add check constraint for ingredient_type  
ALTER TABLE recipe_template_ingredients 
ADD CONSTRAINT check_ingredient_type 
CHECK (ingredient_type IN ('raw_material', 'finished_good', 'packaging', 'consumable'));
