-- Fix Critical Tiramisu Recipe Issues (Corrected)
-- 1. Add missing "Rectangle" ingredient to Tiramisu recipe template
-- 2. Fix unit mismatches in recipe template  
-- 3. Update inventory costs to match specification
-- 4. Standardize units across similar recipes

-- First, add the missing "Rectangle" ingredient to recipe templates
INSERT INTO recipe_template_ingredients (
  recipe_template_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit,
  created_at
)
SELECT 
  rt.id,
  'Rectangle',
  1,
  'pieces',
  5.00, -- Cost as specified in the document
  NOW()
FROM recipe_templates rt
WHERE LOWER(rt.name) LIKE '%tiramisu%'
  AND rt.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM recipe_template_ingredients rti 
    WHERE rti.recipe_template_id = rt.id 
    AND LOWER(rti.ingredient_name) = 'rectangle'
  );

-- Fix unit mismatches in Tiramisu recipe templates
UPDATE recipe_template_ingredients 
SET 
  unit = 'ml',
  quantity = 50,
  cost_per_unit = 2.00
WHERE recipe_template_id IN (
  SELECT id FROM recipe_templates WHERE LOWER(name) LIKE '%tiramisu%' AND is_active = true
)
AND LOWER(ingredient_name) LIKE '%whipped%cream%'
AND unit != 'ml';

UPDATE recipe_template_ingredients 
SET 
  unit = 'pieces',
  quantity = 1,
  cost_per_unit = 2.00
WHERE recipe_template_id IN (
  SELECT id FROM recipe_templates WHERE LOWER(name) LIKE '%tiramisu%' AND is_active = true
)
AND LOWER(ingredient_name) LIKE '%choco%flakes%'
AND unit != 'pieces';

-- Update costs to match specification document
UPDATE recipe_template_ingredients 
SET 
  cost_per_unit = CASE 
    WHEN LOWER(ingredient_name) LIKE '%tiramisu%' THEN 45.00
    WHEN LOWER(ingredient_name) LIKE '%croissant%' THEN 8.00
    WHEN LOWER(ingredient_name) LIKE '%whipped%cream%' THEN 2.00
    WHEN LOWER(ingredient_name) LIKE '%choco%flakes%' THEN 2.00
    WHEN LOWER(ingredient_name) LIKE '%chopstick%' THEN 0.50
    WHEN LOWER(ingredient_name) = 'rectangle' THEN 5.00
    WHEN LOWER(ingredient_name) LIKE '%wax%paper%' THEN 0.50
    ELSE cost_per_unit
  END
WHERE recipe_template_id IN (
  SELECT id FROM recipe_templates WHERE LOWER(name) LIKE '%tiramisu%' AND is_active = true
);

-- Add missing "Rectangle" ingredient to existing deployed recipes
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
  'Rectangle',
  1,
  'pieces',
  5.00,
  NOW(),
  NOW()
FROM recipes r
WHERE LOWER(r.name) LIKE '%tiramisu%'
  AND r.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri 
    WHERE ri.recipe_id = r.id 
    AND LOWER(ri.ingredient_name) = 'rectangle'
  );

-- Fix unit mismatches in deployed recipes
UPDATE recipe_ingredients 
SET 
  unit = 'ml',
  quantity = 50,
  cost_per_unit = 2.00,
  updated_at = NOW()
WHERE recipe_id IN (
  SELECT id FROM recipes WHERE LOWER(name) LIKE '%tiramisu%' AND is_active = true
)
AND LOWER(ingredient_name) LIKE '%whipped%cream%'
AND unit != 'ml';

UPDATE recipe_ingredients 
SET 
  unit = 'pieces',
  quantity = 1,
  cost_per_unit = 2.00,
  updated_at = NOW()
WHERE recipe_id IN (
  SELECT id FROM recipes WHERE LOWER(name) LIKE '%tiramisu%' AND is_active = true
)
AND LOWER(ingredient_name) LIKE '%choco%flakes%'
AND unit != 'pieces';

-- Update costs in deployed recipes to match specification
UPDATE recipe_ingredients 
SET 
  cost_per_unit = CASE 
    WHEN LOWER(ingredient_name) LIKE '%tiramisu%' THEN 45.00
    WHEN LOWER(ingredient_name) LIKE '%croissant%' THEN 8.00
    WHEN LOWER(ingredient_name) LIKE '%whipped%cream%' THEN 2.00
    WHEN LOWER(ingredient_name) LIKE '%choco%flakes%' THEN 2.00
    WHEN LOWER(ingredient_name) LIKE '%chopstick%' THEN 0.50
    WHEN LOWER(ingredient_name) = 'rectangle' THEN 5.00
    WHEN LOWER(ingredient_name) LIKE '%wax%paper%' THEN 0.50
    ELSE cost_per_unit
  END,
  updated_at = NOW()
WHERE recipe_id IN (
  SELECT id FROM recipes WHERE LOWER(name) LIKE '%tiramisu%' AND is_active = true
);

-- Update inventory stock costs to match specification
UPDATE inventory_stock 
SET 
  cost = CASE 
    WHEN LOWER(item) LIKE '%tiramisu%' THEN 45.00
    WHEN LOWER(item) LIKE '%croissant%' THEN 8.00
    WHEN LOWER(item) LIKE '%whipped%cream%' THEN 2.00
    WHEN LOWER(item) LIKE '%choco%flakes%' THEN 2.00
    WHEN LOWER(item) LIKE '%chopstick%' THEN 0.50
    WHEN LOWER(item) = 'rectangle' THEN 5.00
    WHEN LOWER(item) LIKE '%wax%paper%' THEN 0.50
    ELSE cost
  END,
  updated_at = NOW()
WHERE LOWER(item) SIMILAR TO '%(tiramisu|croissant|whipped|choco|chopstick|rectangle|wax.paper)%';

-- Add "Rectangle" to inventory stock if missing
INSERT INTO inventory_stock (
  store_id,
  item,
  item_category,
  unit,
  stock_quantity,
  minimum_threshold,
  cost,
  is_active,
  recipe_compatible,
  created_at,
  updated_at
)
SELECT DISTINCT
  s.id,
  'Rectangle',
  'packaging',
  'pieces',
  0,
  10,
  5.00,
  true,
  true,
  NOW(),
  NOW()
FROM stores s
WHERE s.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM inventory_stock ist 
    WHERE ist.store_id = s.id 
    AND LOWER(ist.item) = 'rectangle'
  );

-- Recalculate recipe costs based on updated ingredient costs
UPDATE recipes 
SET 
  total_cost = (
    SELECT COALESCE(SUM(ri.quantity * ri.cost_per_unit), 0)
    FROM recipe_ingredients ri
    WHERE ri.recipe_id = recipes.id
  ),
  cost_per_serving = (
    SELECT COALESCE(SUM(ri.quantity * ri.cost_per_unit), 0) / GREATEST(serving_size, 1)
    FROM recipe_ingredients ri
    WHERE ri.recipe_id = recipes.id
  ),
  updated_at = NOW()
WHERE LOWER(name) LIKE '%tiramisu%' 
  AND is_active = true;