-- Fix incorrectly linked Coffee ingredient in recipes
-- This addresses the issue where Coffee ingredients were linked to wrong inventory items during import

-- First, let's identify and fix the Coffee ingredient that's incorrectly linked to Chocolate Sauce
UPDATE unified_recipe_ingredients 
SET inventory_stock_id = (
  SELECT id FROM inventory_stock 
  WHERE item = 'Coffee' AND unit = 'kg' 
  LIMIT 1
)
WHERE ingredient_name = 'Coffee' 
AND inventory_stock_id IN (
  SELECT id FROM inventory_stock 
  WHERE item != 'Coffee' AND item LIKE '%Chocolate%'
);

-- Also fix any Coffee ingredients with wrong unit mappings
UPDATE unified_recipe_ingredients 
SET inventory_stock_id = (
  SELECT id FROM inventory_stock 
  WHERE item = 'Coffee' AND unit = 'kg' 
  LIMIT 1
),
unit = 'kg'
WHERE ingredient_name = 'Coffee' 
AND inventory_stock_id IN (
  SELECT id FROM inventory_stock 
  WHERE item = 'Coffee' AND unit != 'kg'
);

-- Update the recipe costs after fixing ingredient links
UPDATE unified_recipes 
SET 
  total_cost = (
    SELECT COALESCE(SUM(uri.quantity * uri.cost_per_unit), 0)
    FROM unified_recipe_ingredients uri
    WHERE uri.recipe_id = unified_recipes.id
  ),
  cost_per_serving = (
    SELECT COALESCE(SUM(uri.quantity * uri.cost_per_unit), 0) / GREATEST(unified_recipes.serving_size, 1)
    FROM unified_recipe_ingredients uri
    WHERE uri.recipe_id = unified_recipes.id
  ),
  updated_at = NOW()
WHERE id IN (
  SELECT DISTINCT recipe_id 
  FROM unified_recipe_ingredients 
  WHERE ingredient_name = 'Coffee'
);