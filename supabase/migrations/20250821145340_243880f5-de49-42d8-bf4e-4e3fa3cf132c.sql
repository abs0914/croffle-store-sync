-- Simple Recipe Migration: Copy all existing recipes to unified system
-- This migration preserves all existing data while enabling the unified system

-- Step 1: Migrate all recipes from recipes table to unified_recipes
INSERT INTO unified_recipes (
  id,
  store_id,
  name,
  description,
  instructions,
  serving_size,
  yield_quantity,
  total_cost,
  cost_per_serving,
  preparation_time,
  cooking_time,
  difficulty_level,
  approval_status,
  is_active,
  created_at,
  updated_at,
  created_by
)
SELECT 
  r.id,
  r.store_id,
  r.name,
  COALESCE(r.description, '') as description,
  COALESCE(r.instructions, '') as instructions,
  COALESCE(r.serving_size, 1) as serving_size,
  COALESCE(r.yield_quantity, r.serving_size, 1) as yield_quantity,
  COALESCE(r.total_cost, 0) as total_cost,
  COALESCE(r.cost_per_serving, 0) as cost_per_serving,
  COALESCE(r.preparation_time, 0) as preparation_time,
  COALESCE(r.cooking_time, 0) as cooking_time,
  COALESCE(r.difficulty_level, 'medium') as difficulty_level,
  CASE WHEN r.is_active THEN 'approved' ELSE 'draft' END as approval_status,
  COALESCE(r.is_active, true) as is_active,
  r.created_at,
  COALESCE(r.updated_at, r.created_at) as updated_at,
  COALESCE(r.created_by, (SELECT user_id FROM app_users WHERE role IN ('admin', 'owner') LIMIT 1)) as created_by
FROM recipes r
WHERE NOT EXISTS (
  SELECT 1 FROM unified_recipes ur WHERE ur.id = r.id
);

-- Step 2: Migrate all recipe ingredients from recipe_ingredients to unified_recipe_ingredients
INSERT INTO unified_recipe_ingredients (
  id,
  recipe_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit,
  total_cost,
  notes,
  is_optional,
  preparation_method,
  created_at,
  updated_at
)
SELECT 
  ri.id,
  ri.recipe_id,
  COALESCE(ri.ingredient_name, 'Unknown Ingredient') as ingredient_name,
  COALESCE(ri.quantity, 0) as quantity,
  COALESCE(ri.unit, 'piece') as unit,
  COALESCE(ri.cost_per_unit, 0) as cost_per_unit,
  COALESCE(ri.quantity * ri.cost_per_unit, 0) as total_cost,
  ri.notes,
  COALESCE(ri.is_optional, false) as is_optional,
  ri.preparation_method,
  ri.created_at,
  COALESCE(ri.updated_at, ri.created_at) as updated_at
FROM recipe_ingredients ri
WHERE EXISTS (
  SELECT 1 FROM unified_recipes ur WHERE ur.id = ri.recipe_id
)
AND NOT EXISTS (
  SELECT 1 FROM unified_recipe_ingredients uri WHERE uri.id = ri.id
);

-- Step 3: Update product_catalog to reference unified recipes
UPDATE product_catalog 
SET recipe_id = r.id
FROM recipes r 
WHERE product_catalog.recipe_id = r.id
AND EXISTS (SELECT 1 FROM unified_recipes ur WHERE ur.id = r.id);

-- Step 4: Update products table to reference unified recipes  
UPDATE products 
SET recipe_id = r.id
FROM recipes r 
WHERE products.recipe_id = r.id
AND EXISTS (SELECT 1 FROM unified_recipes ur WHERE ur.id = r.id);

-- Step 5: Recalculate costs for migrated recipes
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