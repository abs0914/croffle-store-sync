-- Final Working Recipe Migration: Copy all existing recipes to unified system
-- This migration preserves all existing data while enabling the unified system

-- Step 1: Migrate all recipes from recipes table to unified_recipes
INSERT INTO unified_recipes (
  id,
  store_id,
  name,
  serving_size,
  total_cost,
  cost_per_serving,
  is_active,
  created_by,
  created_at,
  updated_at
)
SELECT 
  r.id,
  r.store_id,
  r.name,
  COALESCE(r.serving_size::integer, 1) as serving_size,
  COALESCE(r.total_cost, 0) as total_cost,
  COALESCE(r.cost_per_serving, 0) as cost_per_serving,
  COALESCE(r.is_active, true) as is_active,
  (SELECT user_id FROM app_users WHERE role IN ('admin', 'owner') LIMIT 1) as created_by,
  r.created_at,
  r.updated_at
FROM recipes r
WHERE NOT EXISTS (
  SELECT 1 FROM unified_recipes ur WHERE ur.id = r.id
);

-- Step 2: Migrate recipe ingredients (excluding generated total_cost column)
INSERT INTO unified_recipe_ingredients (
  id,
  recipe_id,
  inventory_stock_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit,
  created_at,
  updated_at
)
SELECT 
  ri.id,
  ri.recipe_id,
  ri.inventory_stock_id,
  COALESCE(ri.ingredient_name, 'Unknown Ingredient') as ingredient_name,
  ri.quantity,
  COALESCE(ri.recipe_unit, ri.unit::text, 'piece') as unit,
  COALESCE(ri.cost_per_unit, 0) as cost_per_unit,
  ri.created_at,
  COALESCE(ri.created_at, now()) as updated_at
FROM recipe_ingredients ri
WHERE EXISTS (
  SELECT 1 FROM unified_recipes ur WHERE ur.id = ri.recipe_id
)
AND NOT EXISTS (
  SELECT 1 FROM unified_recipe_ingredients uri WHERE uri.id = ri.id
);

-- Step 3: Recalculate costs for migrated recipes (total_cost will be auto-calculated)
UPDATE unified_recipes 
SET 
  total_cost = COALESCE((
    SELECT SUM(uri.total_cost)
    FROM unified_recipe_ingredients uri
    WHERE uri.recipe_id = unified_recipes.id
  ), 0),
  cost_per_serving = CASE 
    WHEN serving_size > 0 THEN COALESCE((
      SELECT SUM(uri.total_cost) / unified_recipes.serving_size
      FROM unified_recipe_ingredients uri
      WHERE uri.recipe_id = unified_recipes.id
    ), 0)
    ELSE 0
  END,
  updated_at = NOW();