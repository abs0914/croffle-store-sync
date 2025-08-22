-- Fix whipped cream unit mismatch in recipe ingredients
-- Update all whipped cream ingredients from ml to pieces unit for croffle recipes
UPDATE recipe_ingredients 
SET 
  quantity = 1,
  unit = 'pieces',
  ingredient_name = 'WHIPPED CREAM'
WHERE LOWER(ingredient_name) LIKE '%whipped cream%'
  AND unit = 'ml'
  AND quantity = 50;

-- Also update recipe template ingredients for consistency
UPDATE recipe_template_ingredients
SET 
  quantity = 1,
  unit = 'pieces',
  ingredient_name = 'WHIPPED CREAM'
WHERE LOWER(ingredient_name) LIKE '%whipped cream%'
  AND unit = 'ml'
  AND quantity = 50;

-- Ensure inventory stock items use consistent naming and pieces unit
UPDATE inventory_stock
SET 
  item = 'WHIPPED CREAM',
  unit = 'pieces'
WHERE LOWER(item) LIKE '%whipped cream%'
  AND (item != 'WHIPPED CREAM' OR unit != 'pieces');