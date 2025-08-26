
-- Remove the redundant ingredient_category field from recipe_template_ingredients
ALTER TABLE recipe_template_ingredients DROP COLUMN IF EXISTS ingredient_category;

-- Remove the check constraint that was associated with ingredient_category
ALTER TABLE recipe_template_ingredients DROP CONSTRAINT IF EXISTS check_ingredient_category;
