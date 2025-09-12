-- Fix Bottled Water ingredient mappings
-- Add missing ingredient entries for all Bottled Water recipes

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
  r.id as recipe_id,
  'Bottled Water' as ingredient_name,
  1 as quantity,
  'pieces' as unit,
  COALESCE(ist.unit_cost, 0) as cost_per_unit,
  ist.id as inventory_stock_id,
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
    SELECT 1 FROM unified_recipe_ingredients uri
    WHERE uri.recipe_id = r.id
  );