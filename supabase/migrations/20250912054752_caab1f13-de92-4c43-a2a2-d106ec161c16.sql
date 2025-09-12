-- Create Bottled Water entries in unified system
-- Step 1: Create unified_recipes for Bottled Water
INSERT INTO unified_recipes (
  name,
  store_id,
  total_cost,
  cost_per_serving,
  serving_size,
  is_active,
  created_at,
  updated_at
)
SELECT DISTINCT
  'Bottled Water' as name,
  r.store_id,
  COALESCE(ist.cost, 0) as total_cost,
  COALESCE(ist.cost, 0) as cost_per_serving,
  1 as serving_size,
  true as is_active,
  NOW() as created_at,
  NOW() as updated_at
FROM recipes r
JOIN inventory_stock ist ON (
  r.store_id = ist.store_id 
  AND LOWER(TRIM(ist.item)) = 'bottled water'
  AND ist.is_active = true
)
WHERE LOWER(TRIM(r.name)) = 'bottled water'
  AND r.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM unified_recipes ur
    WHERE ur.name = 'Bottled Water' 
    AND ur.store_id = r.store_id
  );

-- Step 2: Create unified_recipe_ingredients for Bottled Water
INSERT INTO unified_recipe_ingredients (
  recipe_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit,
  inventory_stock_id,
  created_at,
  updated_at
)
SELECT 
  ur.id as recipe_id,
  'Bottled Water' as ingredient_name,
  1 as quantity,
  'pieces' as unit,
  COALESCE(ist.cost, 0) as cost_per_unit,
  ist.id as inventory_stock_id,
  NOW() as created_at,
  NOW() as updated_at
FROM unified_recipes ur
JOIN inventory_stock ist ON (
  ur.store_id = ist.store_id 
  AND LOWER(TRIM(ist.item)) = 'bottled water'
  AND ist.is_active = true
)
WHERE ur.name = 'Bottled Water'
  AND ur.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM unified_recipe_ingredients uri
    WHERE uri.recipe_id = ur.id
  );