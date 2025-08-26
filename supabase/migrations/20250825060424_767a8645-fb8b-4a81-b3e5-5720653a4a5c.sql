-- Step-by-step repair migration for Sugbo Mercado store synchronization issues

-- Step 1: Create missing inventory items for ingredients that don't exist
INSERT INTO inventory_stock (
  store_id, 
  item_name, 
  current_stock, 
  unit, 
  cost_per_unit,
  minimum_threshold,
  is_active,
  created_at,
  updated_at
)
SELECT DISTINCT
  'd7c47e6b-f20a-4543-a6bd-000398f72df5',
  rti.ingredient_name,
  0,
  CASE 
    WHEN rti.unit::text = ANY(enum_range(NULL::inventory_unit)::text[]) 
    THEN rti.unit::inventory_unit
    ELSE 'pieces'::inventory_unit
  END,
  rti.cost_per_unit,
  0,
  true,
  NOW(),
  NOW()
FROM recipe_template_ingredients rti
JOIN recipe_templates rt ON rti.recipe_template_id = rt.id
WHERE rt.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM inventory_stock ist
    WHERE ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
      AND LOWER(TRIM(ist.item_name)) = LOWER(TRIM(rti.ingredient_name))
  );

-- Step 2: Add missing ingredients to incomplete recipes
INSERT INTO recipe_ingredients (
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
  r.id,
  rti.ingredient_name,
  rti.quantity,
  CASE 
    WHEN rti.unit::text = ANY(enum_range(NULL::inventory_unit)::text[]) 
    THEN rti.unit::inventory_unit
    ELSE 'pieces'::inventory_unit
  END,
  rti.cost_per_unit,
  ist.id,
  NOW(),
  NOW()
FROM recipes r
JOIN recipe_templates rt ON r.template_id = rt.id
JOIN recipe_template_ingredients rti ON rti.recipe_template_id = rt.id
JOIN inventory_stock ist ON ist.store_id = r.store_id 
  AND LOWER(TRIM(ist.item_name)) = LOWER(TRIM(rti.ingredient_name))
WHERE r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND r.is_active = true
  AND rt.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri
    WHERE ri.recipe_id = r.id
      AND LOWER(TRIM(ri.ingredient_name)) = LOWER(TRIM(rti.ingredient_name))
  );

-- Step 3: Update recipe costs
UPDATE recipes SET
  total_cost = COALESCE((
    SELECT SUM(ri.quantity * ri.cost_per_unit)
    FROM recipe_ingredients ri
    WHERE ri.recipe_id = recipes.id
  ), 0),
  cost_per_serving = COALESCE((
    SELECT SUM(ri.quantity * ri.cost_per_unit) / GREATEST(recipes.serving_size, 1)
    FROM recipe_ingredients ri
    WHERE ri.recipe_id = recipes.id
  ), 0),
  updated_at = NOW()
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND is_active = true;