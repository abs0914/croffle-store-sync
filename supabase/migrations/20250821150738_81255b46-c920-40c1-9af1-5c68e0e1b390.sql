-- Fix Recipe System: Clean duplicates, update costs, and fix mappings (Fixed version)

-- Step 1: Remove duplicate recipe ingredients (keep the first one of each duplicate)
DELETE FROM unified_recipe_ingredients 
WHERE id NOT IN (
  SELECT DISTINCT ON (recipe_id, ingredient_name) id
  FROM unified_recipe_ingredients
  ORDER BY recipe_id, ingredient_name, created_at
);

-- Step 2: Fix "Unknown Ingredient" names by mapping to inventory items
-- Map common ingredients that might be unnamed
UPDATE unified_recipe_ingredients 
SET ingredient_name = 'Coffee Beans'
WHERE ingredient_name = 'Unknown Ingredient' 
AND recipe_id IN (
  SELECT id FROM unified_recipes 
  WHERE name ILIKE '%americano%' OR name ILIKE '%espresso%' OR name ILIKE '%coffee%'
);

UPDATE unified_recipe_ingredients 
SET ingredient_name = 'Milk'
WHERE ingredient_name = 'Unknown Ingredient' 
AND recipe_id IN (
  SELECT id FROM unified_recipes 
  WHERE name ILIKE '%latte%' OR name ILIKE '%cappuccino%' OR name ILIKE '%milk%'
);

UPDATE unified_recipe_ingredients 
SET ingredient_name = 'Sugar'
WHERE ingredient_name = 'Unknown Ingredient' 
AND recipe_id IN (
  SELECT id FROM unified_recipes 
  WHERE name ILIKE '%sweet%' OR name ILIKE '%sugar%'
);

-- Step 3: Update ingredient costs from inventory stock
UPDATE unified_recipe_ingredients 
SET cost_per_unit = COALESCE(ist.cost, 5.0)
FROM inventory_stock ist
WHERE LOWER(TRIM(unified_recipe_ingredients.ingredient_name)) = LOWER(TRIM(ist.item))
AND ist.is_active = true
AND (unified_recipe_ingredients.cost_per_unit = 0 OR unified_recipe_ingredients.cost_per_unit IS NULL);

-- Step 4: Set default costs for ingredients that still have no cost
UPDATE unified_recipe_ingredients 
SET cost_per_unit = CASE 
  WHEN ingredient_name ILIKE '%coffee%' THEN 15.0
  WHEN ingredient_name ILIKE '%milk%' THEN 8.0
  WHEN ingredient_name ILIKE '%sugar%' THEN 3.0
  WHEN ingredient_name ILIKE '%syrup%' THEN 12.0
  WHEN ingredient_name ILIKE '%cream%' THEN 10.0
  WHEN ingredient_name ILIKE '%chocolate%' THEN 25.0
  WHEN ingredient_name ILIKE '%vanilla%' THEN 18.0
  WHEN ingredient_name ILIKE '%biscoff%' THEN 20.0
  WHEN ingredient_name ILIKE '%jam%' THEN 15.0
  WHEN ingredient_name = 'Unknown Ingredient' THEN 5.0
  ELSE 10.0
END
WHERE cost_per_unit = 0 OR cost_per_unit IS NULL;

-- Step 5: Recalculate recipe total costs and cost per serving
UPDATE unified_recipes 
SET 
  total_cost = COALESCE(ingredient_totals.total_ingredient_cost, 0),
  cost_per_serving = COALESCE(ingredient_totals.total_ingredient_cost, 0) / GREATEST(serving_size, 1),
  updated_at = NOW()
FROM (
  SELECT 
    recipe_id,
    SUM(quantity * cost_per_unit) as total_ingredient_cost
  FROM unified_recipe_ingredients
  GROUP BY recipe_id
) AS ingredient_totals
WHERE unified_recipes.id = ingredient_totals.recipe_id;