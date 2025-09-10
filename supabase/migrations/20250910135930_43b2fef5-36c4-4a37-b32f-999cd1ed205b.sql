-- Comprehensive fix for Classic - Choco Nut inventory mapping issues
-- Phase 1: Fix Recipe Template

-- Update Choco Nut Croffle recipe template ingredients with correct units and costs
UPDATE recipe_template_ingredients 
SET 
  quantity = CASE 
    WHEN ingredient_name = 'Whipped Cream' THEN 1
    WHEN ingredient_name = 'Chocolate Sauce' THEN 1
    WHEN ingredient_name = 'Peanut' THEN 1
    ELSE quantity
  END,
  unit = CASE 
    WHEN ingredient_name = 'Whipped Cream' THEN 'serving'
    WHEN ingredient_name = 'Chocolate Sauce' THEN 'portion'
    WHEN ingredient_name = 'Peanut' THEN 'portion'
    ELSE unit
  END,
  cost_per_unit = CASE 
    WHEN ingredient_name = 'Whipped Cream' THEN 5.00
    WHEN ingredient_name = 'Chocolate Sauce' THEN 3.00
    WHEN ingredient_name = 'Peanut' THEN 8.00
    WHEN ingredient_name = 'Regular Croissant' THEN 15.00
    WHEN ingredient_name = 'Chopstick' THEN 1.00
    WHEN ingredient_name = 'Wax Paper' THEN 2.00
    ELSE cost_per_unit
  END
WHERE recipe_template_id = (
  SELECT id FROM recipe_templates WHERE name = 'Choco Nut Croffle'
) AND ingredient_name IN ('Whipped Cream', 'Chocolate Sauce', 'Peanut', 'Regular Croissant', 'Chopstick', 'Wax Paper');

-- Add missing Rectangle ingredient to recipe template
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
  'piece',
  3.00,
  NOW()
FROM recipe_templates rt
WHERE rt.name = 'Choco Nut Croffle'
  AND NOT EXISTS (
    SELECT 1 FROM recipe_template_ingredients rti
    WHERE rti.recipe_template_id = rt.id 
    AND rti.ingredient_name = 'Rectangle'
  );

-- Phase 2: Update Inventory Stock costs and add Rectangle if missing
UPDATE inventory_stock 
SET 
  cost = CASE 
    WHEN item = 'Whipped Cream' THEN 5.00
    WHEN item = 'Chocolate Sauce' THEN 3.00
    WHEN item = 'Peanut' THEN 8.00
    WHEN item = 'Regular Croissant' THEN 15.00
    WHEN item = 'Chopstick' THEN 1.00
    WHEN item = 'Wax Paper' THEN 2.00
    ELSE cost
  END,
  updated_at = NOW()
WHERE item IN ('Whipped Cream', 'Chocolate Sauce', 'Peanut', 'Regular Croissant', 'Chopstick', 'Wax Paper');

-- Add Rectangle to inventory_stock for all stores if missing
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
  s.id as store_id,
  'Rectangle',
  'packaging'::inventory_item_category,
  'piece',
  0,
  10,
  3.00,
  true,
  true,
  NOW(),
  NOW()
FROM stores s
WHERE s.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM inventory_stock ist
    WHERE ist.store_id = s.id 
    AND ist.item = 'Rectangle'
  );

-- Phase 3: Update all deployed Choco Nut Croffle recipes with corrected ingredients
-- First, update existing recipe ingredients with correct units and costs
UPDATE recipe_ingredients 
SET 
  quantity = CASE 
    WHEN ingredient_name = 'Whipped Cream' THEN 1
    WHEN ingredient_name = 'Chocolate Sauce' THEN 1
    WHEN ingredient_name = 'Peanut' THEN 1
    ELSE quantity
  END,
  unit = CASE 
    WHEN ingredient_name = 'Whipped Cream' THEN 'serving'::inventory_unit
    WHEN ingredient_name = 'Chocolate Sauce' THEN 'pieces'::inventory_unit
    WHEN ingredient_name = 'Peanut' THEN 'pieces'::inventory_unit
    ELSE unit
  END,
  cost_per_unit = CASE 
    WHEN ingredient_name = 'Whipped Cream' THEN 5.00
    WHEN ingredient_name = 'Chocolate Sauce' THEN 3.00
    WHEN ingredient_name = 'Peanut' THEN 8.00
    WHEN ingredient_name = 'Regular Croissant' THEN 15.00
    WHEN ingredient_name = 'Chopstick' THEN 1.00
    WHEN ingredient_name = 'Wax Paper' THEN 2.00
    ELSE cost_per_unit
  END,
  updated_at = NOW()
WHERE recipe_id IN (
  SELECT id FROM recipes WHERE name = 'Choco Nut Croffle' AND is_active = true
) AND ingredient_name IN ('Whipped Cream', 'Chocolate Sauce', 'Peanut', 'Regular Croissant', 'Chopstick', 'Wax Paper');

-- Add missing Rectangle ingredient to all deployed Choco Nut Croffle recipes
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
  'pieces'::inventory_unit,
  3.00,
  NOW(),
  NOW()
FROM recipes r
WHERE r.name = 'Choco Nut Croffle' 
  AND r.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri
    WHERE ri.recipe_id = r.id 
    AND ri.ingredient_name = 'Rectangle'
  );

-- Phase 4: Create recipe ingredient mappings for Rectangle
INSERT INTO recipe_ingredient_mappings (
  recipe_id,
  ingredient_name,
  inventory_stock_id,
  conversion_factor,
  created_at,
  updated_at
)
SELECT 
  r.id,
  'Rectangle',
  ist.id,
  1.0,
  NOW(),
  NOW()
FROM recipes r
CROSS JOIN inventory_stock ist
WHERE r.name = 'Choco Nut Croffle' 
  AND r.is_active = true
  AND ist.item = 'Rectangle'
  AND ist.store_id = r.store_id
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredient_mappings rim
    WHERE rim.recipe_id = r.id 
    AND rim.ingredient_name = 'Rectangle'
  );

-- Phase 5: Recalculate recipe costs for all Choco Nut Croffle recipes
-- Update total_cost and cost_per_serving
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
WHERE name = 'Choco Nut Croffle' AND is_active = true;

-- Phase 6: Update product catalog pricing if needed (using suggested price from template)
UPDATE product_catalog 
SET 
  price = COALESCE(
    (SELECT suggested_price FROM recipe_templates WHERE name = 'Choco Nut Croffle'),
    45.00
  ),
  updated_at = NOW()
WHERE product_name = 'Choco Nut Croffle' AND is_available = true;