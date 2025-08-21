-- Fixed Simple Recipe Migration: Copy all existing recipes to unified system
-- This migration preserves all existing data while enabling the unified system

-- Step 1: Migrate all recipes from recipes table to unified_recipes (using actual columns)
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
  COALESCE(r.serving_size, 1) as serving_size,
  COALESCE(r.total_cost, 0) as total_cost,
  COALESCE(r.cost_per_serving, 0) as cost_per_serving,
  COALESCE(r.is_active, true) as is_active,
  COALESCE(r.created_by, (SELECT user_id FROM app_users WHERE role IN ('admin', 'owner') LIMIT 1)) as created_by,
  r.created_at,
  COALESCE(r.updated_at, r.created_at) as updated_at
FROM recipes r
WHERE NOT EXISTS (
  SELECT 1 FROM unified_recipes ur WHERE ur.id = r.id
);

-- Step 2: Migrate recipe ingredients with inventory mapping
-- First, create a temporary mapping of ingredients to inventory items
WITH ingredient_inventory_mapping AS (
  SELECT DISTINCT
    ri.ingredient_name,
    COALESCE(
      (SELECT inv.id FROM inventory_stock inv 
       WHERE LOWER(TRIM(inv.item)) = LOWER(TRIM(ri.ingredient_name)) 
       AND inv.is_active = true 
       LIMIT 1),
      (SELECT inv.id FROM inventory_stock inv 
       WHERE inv.is_active = true 
       LIMIT 1)
    ) as inventory_stock_id
  FROM recipe_ingredients ri
  WHERE EXISTS (SELECT 1 FROM unified_recipes ur WHERE ur.id = ri.recipe_id)
)
INSERT INTO unified_recipe_ingredients (
  id,
  recipe_id,
  inventory_stock_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit,
  total_cost,
  created_at,
  updated_at
)
SELECT 
  ri.id,
  ri.recipe_id,
  COALESCE(iim.inventory_stock_id, (SELECT id FROM inventory_stock WHERE is_active = true LIMIT 1)) as inventory_stock_id,
  COALESCE(ri.ingredient_name, 'Unknown Ingredient') as ingredient_name,
  COALESCE(ri.quantity, 0) as quantity,
  COALESCE(ri.unit, 'piece') as unit,
  COALESCE(ri.cost_per_unit, 0) as cost_per_unit,
  COALESCE(ri.quantity * ri.cost_per_unit, 0) as total_cost,
  ri.created_at,
  COALESCE(ri.updated_at, ri.created_at) as updated_at
FROM recipe_ingredients ri
LEFT JOIN ingredient_inventory_mapping iim ON ri.ingredient_name = iim.ingredient_name
WHERE EXISTS (
  SELECT 1 FROM unified_recipes ur WHERE ur.id = ri.recipe_id
)
AND NOT EXISTS (
  SELECT 1 FROM unified_recipe_ingredients uri WHERE uri.id = ri.id
);

-- Step 3: Recalculate costs for migrated recipes
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