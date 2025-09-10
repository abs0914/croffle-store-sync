-- Comprehensive fix for Caramel Delight and Choco Marshmallow inventory mapping issues
-- Phase 1: CRITICAL FIXES

-- 1. Add missing Rectangle ingredient to both recipe templates
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
  6.00,
  NOW()
FROM recipe_templates rt
WHERE rt.name IN ('Caramel Delight Croffle', 'Choco Marshmallow Croffle')
  AND NOT EXISTS (
    SELECT 1 FROM recipe_template_ingredients rti
    WHERE rti.recipe_template_id = rt.id 
    AND rti.ingredient_name = 'Rectangle'
  );

-- 2. Update all zero costs and fix units in recipe templates to match specifications
-- Caramel Delight Croffle template fixes
UPDATE recipe_template_ingredients 
SET 
  quantity = CASE 
    WHEN ingredient_name = 'Whipped Cream' THEN 1
    ELSE quantity
  END,
  unit = CASE 
    WHEN ingredient_name = 'Whipped Cream' THEN 'serving'
    WHEN ingredient_name = 'Caramel Sauce' THEN 'portion'
    WHEN ingredient_name = 'Colored Sprinkles' THEN 'portion'
    WHEN ingredient_name = 'Chopstick' THEN 'pair'
    ELSE unit
  END,
  cost_per_unit = CASE 
    WHEN ingredient_name = 'Regular Croissant' THEN 30.00
    WHEN ingredient_name = 'Whipped Cream' THEN 8.00
    WHEN ingredient_name = 'Caramel Sauce' THEN 2.50
    WHEN ingredient_name = 'Colored Sprinkles' THEN 2.50
    WHEN ingredient_name = 'Chopstick' THEN 0.60
    WHEN ingredient_name = 'Wax Paper' THEN 0.70
    ELSE cost_per_unit
  END
WHERE recipe_template_id = (
  SELECT id FROM recipe_templates WHERE name = 'Caramel Delight Croffle'
);

-- Choco Marshmallow Croffle template fixes
UPDATE recipe_template_ingredients 
SET 
  quantity = CASE 
    WHEN ingredient_name = 'Whipped Cream' THEN 1
    ELSE quantity
  END,
  unit = CASE 
    WHEN ingredient_name = 'Whipped Cream' THEN 'serving'
    WHEN ingredient_name = 'Chocolate Sauce' THEN 'portion'
    WHEN ingredient_name = 'Marshmallow' THEN 'portion'
    WHEN ingredient_name = 'Chopstick' THEN 'pair'
    ELSE unit
  END,
  cost_per_unit = CASE 
    WHEN ingredient_name = 'Regular Croissant' THEN 30.00
    WHEN ingredient_name = 'Whipped Cream' THEN 8.00
    WHEN ingredient_name = 'Chocolate Sauce' THEN 2.50
    WHEN ingredient_name = 'Marshmallow' THEN 2.50
    WHEN ingredient_name = 'Chopstick' THEN 0.60
    WHEN ingredient_name = 'Wax Paper' THEN 0.70
    ELSE cost_per_unit
  END
WHERE recipe_template_id = (
  SELECT id FROM recipe_templates WHERE name = 'Choco Marshmallow Croffle'
);

-- Phase 2: HIGH PRIORITY FIXES

-- 3. Update inventory stock costs to match specifications - keep existing units
UPDATE inventory_stock 
SET 
  cost = CASE 
    WHEN item = 'Regular Croissant' THEN 30.00
    WHEN item = 'Whipped Cream' THEN 8.00
    WHEN item = 'Caramel Sauce' THEN 2.50
    WHEN item = 'Colored Sprinkles' THEN 2.50
    WHEN item = 'Chocolate Sauce' THEN 2.50
    WHEN item = 'Marshmallow' THEN 2.50
    WHEN item = 'Chopstick' THEN 0.60
    WHEN item = 'Wax Paper' THEN 0.70
    WHEN item = 'Rectangle' THEN 6.00
    ELSE cost
  END,
  updated_at = NOW()
WHERE item IN (
  'Regular Croissant', 'Whipped Cream', 'Caramel Sauce', 'Colored Sprinkles', 
  'Chocolate Sauce', 'Marshmallow', 'Chopstick', 'Wax Paper', 'Rectangle'
);

-- 4. Update all deployed recipes with corrected costs using valid inventory units
UPDATE recipe_ingredients 
SET 
  quantity = CASE 
    WHEN ingredient_name = 'Whipped Cream' THEN 1
    ELSE quantity
  END,
  unit = CASE 
    WHEN ingredient_name = 'Whipped Cream' THEN 'pieces'::inventory_unit
    WHEN ingredient_name = 'Caramel Sauce' THEN 'pieces'::inventory_unit
    WHEN ingredient_name = 'Colored Sprinkles' THEN 'pieces'::inventory_unit
    WHEN ingredient_name = 'Chocolate Sauce' THEN 'pieces'::inventory_unit
    WHEN ingredient_name = 'Marshmallow' THEN 'pieces'::inventory_unit
    WHEN ingredient_name = 'Chopstick' THEN 'pieces'::inventory_unit
    ELSE unit
  END,
  cost_per_unit = CASE 
    WHEN ingredient_name = 'Regular Croissant' THEN 30.00
    WHEN ingredient_name = 'Whipped Cream' THEN 8.00
    WHEN ingredient_name = 'Caramel Sauce' THEN 2.50
    WHEN ingredient_name = 'Colored Sprinkles' THEN 2.50
    WHEN ingredient_name = 'Chocolate Sauce' THEN 2.50
    WHEN ingredient_name = 'Marshmallow' THEN 2.50
    WHEN ingredient_name = 'Chopstick' THEN 0.60
    WHEN ingredient_name = 'Wax Paper' THEN 0.70
    ELSE cost_per_unit
  END,
  updated_at = NOW()
WHERE recipe_id IN (
  SELECT id FROM recipes WHERE name IN ('Caramel Delight Croffle', 'Choco Marshmallow Croffle') AND is_active = true
);

-- 5. Add missing Rectangle ingredient to all deployed recipes
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
  6.00,
  NOW(),
  NOW()
FROM recipes r
WHERE r.name IN ('Caramel Delight Croffle', 'Choco Marshmallow Croffle')
  AND r.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri
    WHERE ri.recipe_id = r.id 
    AND ri.ingredient_name = 'Rectangle'
  );

-- 6. Create ALL missing recipe ingredient mappings for both products
-- This is critical for Caramel Delight which has no mappings
INSERT INTO recipe_ingredient_mappings (
  recipe_id,
  ingredient_name,
  inventory_stock_id,
  conversion_factor,
  created_at,
  updated_at
)
SELECT DISTINCT
  r.id,
  ri.ingredient_name,
  ist.id,
  1.0,
  NOW(),
  NOW()
FROM recipes r
JOIN recipe_ingredients ri ON r.id = ri.recipe_id
JOIN inventory_stock ist ON (
  LOWER(TRIM(ri.ingredient_name)) = LOWER(TRIM(ist.item))
  AND ist.store_id = r.store_id
  AND ist.is_active = true
)
WHERE r.name IN ('Caramel Delight Croffle', 'Choco Marshmallow Croffle')
  AND r.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredient_mappings rim
    WHERE rim.recipe_id = r.id 
    AND rim.ingredient_name = ri.ingredient_name
  );

-- 7. Recalculate recipe costs for both products
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
WHERE name IN ('Caramel Delight Croffle', 'Choco Marshmallow Croffle') 
AND is_active = true;

-- 8. Update product catalog pricing to reflect new costs
-- Caramel Delight: Total cost should be ₱49.30 (30+8+2.5+2.5+6+0.6+0.7)
-- Choco Marshmallow: Total cost should be ₱49.30 (30+8+2.5+2.5+6+0.6+0.7)
UPDATE product_catalog 
SET 
  price = CASE 
    WHEN product_name = 'Caramel Delight Croffle' THEN 125.00
    WHEN product_name = 'Choco Marshmallow Croffle' THEN 125.00
    ELSE price
  END,
  updated_at = NOW()
WHERE product_name IN ('Caramel Delight Croffle', 'Choco Marshmallow Croffle') 
AND is_available = true;