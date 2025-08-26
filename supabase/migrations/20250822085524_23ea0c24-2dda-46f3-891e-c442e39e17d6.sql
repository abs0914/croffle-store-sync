-- Fix whipped cream unit mismatch in recipe ingredients
-- Update all whipped cream ingredients from ml to Serving unit for croffle recipes
UPDATE recipe_ingredients 
SET 
  quantity = 1,
  unit = 'Serving',
  ingredient_name = 'WHIPPED CREAM'
WHERE LOWER(ingredient_name) LIKE '%whipped cream%'
  AND unit = 'ml'
  AND quantity = 50;

-- Also update recipe template ingredients for consistency
UPDATE recipe_template_ingredients
SET 
  quantity = 1,
  unit = 'Serving',
  ingredient_name = 'WHIPPED CREAM'
WHERE LOWER(ingredient_name) LIKE '%whipped cream%'
  AND unit = 'ml'
  AND quantity = 50;

-- Update any recipe ingredient mappings to ensure proper inventory sync
UPDATE recipe_ingredient_mappings
SET ingredient_name = 'WHIPPED CREAM'
WHERE LOWER(ingredient_name) LIKE '%whipped cream%';

-- Ensure inventory stock items use consistent naming
UPDATE inventory_stock
SET item = 'WHIPPED CREAM'
WHERE LOWER(item) LIKE '%whipped cream%'
  AND item != 'WHIPPED CREAM';