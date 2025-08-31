-- Fix missing recipes by linking existing products to recipe templates
-- Create recipes for products that match recipe template names

-- First, create recipes for products that match recipe templates exactly
INSERT INTO recipes (
  name,
  store_id, 
  product_id,
  template_id,
  is_active,
  serving_size,
  total_cost,
  cost_per_serving,
  instructions,
  created_at,
  updated_at
)
SELECT DISTINCT
  p.name,
  p.store_id,
  p.id,
  rt.id,
  true,
  1,
  0,
  0,
  'Auto-generated recipe from template: ' || rt.name,
  NOW(),
  NOW()
FROM products p
JOIN recipe_templates rt ON LOWER(TRIM(p.name)) = LOWER(TRIM(rt.name))
LEFT JOIN recipes r ON (r.product_id = p.id AND r.store_id = p.store_id AND r.is_active = true)
WHERE p.is_active = true
  AND rt.is_active = true
  AND r.id IS NULL; -- Only create if recipe doesn't exist

-- Create recipe ingredients for the newly created recipes
INSERT INTO recipe_ingredients (
  recipe_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit,
  created_at,
  updated_at
)
SELECT 
  r.id,
  rti.ingredient_name,
  rti.quantity,
  rti.unit::text,
  rti.cost_per_unit,
  NOW(),
  NOW()
FROM recipes r
JOIN recipe_templates rt ON r.template_id = rt.id
JOIN recipe_template_ingredients rti ON rt.id = rti.recipe_template_id
WHERE r.created_at >= NOW() - INTERVAL '1 minute' -- Only for recently created recipes
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri
    WHERE ri.recipe_id = r.id
      AND LOWER(TRIM(ri.ingredient_name)) = LOWER(TRIM(rti.ingredient_name))
  );

-- Update recipe costs based on ingredients
UPDATE recipes 
SET 
  total_cost = (
    SELECT COALESCE(SUM(ri.quantity * ri.cost_per_unit), 0)
    FROM recipe_ingredients ri
    WHERE ri.recipe_id = recipes.id
  ),
  cost_per_serving = (
    SELECT COALESCE(SUM(ri.quantity * ri.cost_per_unit), 0) / GREATEST(serving.size, 1)
    FROM recipe_ingredients ri
    WHERE ri.recipe_id = recipes.id
  ),
  updated_at = NOW()
WHERE created_at >= NOW() - INTERVAL '1 minute';

-- Map recipe ingredients to inventory stock for the new recipes
INSERT INTO recipe_ingredient_mappings (
  recipe_id,
  ingredient_name,
  inventory_stock_id,
  conversion_factor,
  created_at,
  updated_at
)
SELECT DISTINCT
  ri.recipe_id,
  ri.ingredient_name,
  ist.id,
  1.0,
  NOW(),
  NOW()
FROM recipe_ingredients ri
JOIN recipes r ON ri.recipe_id = r.id
JOIN inventory_stock ist ON (
  r.store_id = ist.store_id 
  AND ist.is_active = true
  AND (
    LOWER(TRIM(ist.item)) = LOWER(TRIM(ri.ingredient_name))
    OR LOWER(TRIM(ist.item)) LIKE '%' || LOWER(TRIM(ri.ingredient_name)) || '%'
    OR LOWER(TRIM(ri.ingredient_name)) LIKE '%' || LOWER(TRIM(ist.item)) || '%'
  )
)
WHERE r.created_at >= NOW() - INTERVAL '1 minute'
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredient_mappings rim
    WHERE rim.recipe_id = ri.recipe_id
      AND rim.ingredient_name = ri.ingredient_name
  );