-- Create missing Rectangle and Coke inventory mappings
-- This will enable inventory deduction for these ingredients

-- Step 1: Create missing Rectangle mappings for all recipes
INSERT INTO recipe_ingredient_mappings (
  recipe_id,
  ingredient_name,
  inventory_stock_id,
  conversion_factor,
  created_at,
  updated_at
)
SELECT DISTINCT
  r.id as recipe_id,
  'Rectangle' as ingredient_name,
  ist.id as inventory_stock_id,
  1.0 as conversion_factor,
  NOW() as created_at,
  NOW() as updated_at
FROM recipes r
JOIN recipe_ingredients ri ON ri.recipe_id = r.id
JOIN inventory_stock ist ON ist.store_id = r.store_id
WHERE LOWER(TRIM(ri.ingredient_name)) = 'rectangle'
  AND LOWER(TRIM(ist.item)) = 'rectangle'
  AND ist.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredient_mappings rim
    WHERE rim.recipe_id = r.id 
      AND LOWER(TRIM(rim.ingredient_name)) = 'rectangle'
  );

-- Step 2: Create missing Coke mapping for Coke product
INSERT INTO recipe_ingredient_mappings (
  recipe_id,
  ingredient_name,
  inventory_stock_id,
  conversion_factor,
  created_at,
  updated_at
)
SELECT DISTINCT
  r.id as recipe_id,
  ri.ingredient_name,
  ist.id as inventory_stock_id,
  1.0 as conversion_factor,
  NOW() as created_at,
  NOW() as updated_at
FROM recipes r
JOIN recipe_ingredients ri ON ri.recipe_id = r.id
JOIN inventory_stock ist ON ist.store_id = r.store_id
WHERE LOWER(TRIM(ri.ingredient_name)) = 'coke'
  AND LOWER(TRIM(ist.item)) = 'coke'
  AND ist.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredient_mappings rim
    WHERE rim.recipe_id = r.id 
      AND LOWER(TRIM(rim.ingredient_name)) = 'coke'
  );

-- Step 3: Update conversion_mappings table with new mappings
INSERT INTO conversion_mappings (
  inventory_stock_id,
  recipe_ingredient_name,
  recipe_ingredient_unit,
  conversion_factor,
  notes,
  created_at,
  updated_at
)
SELECT DISTINCT
  rim.inventory_stock_id,
  rim.ingredient_name,
  ri.unit::text,
  1.0,
  'Auto-generated mapping for missing ingredients',
  NOW(),
  NOW()
FROM recipe_ingredient_mappings rim
JOIN recipe_ingredients ri ON ri.recipe_id = rim.recipe_id 
  AND LOWER(TRIM(ri.ingredient_name)) = LOWER(TRIM(rim.ingredient_name))
WHERE rim.created_at > NOW() - INTERVAL '1 minute'
  AND NOT EXISTS (
    SELECT 1 FROM conversion_mappings cm
    WHERE cm.inventory_stock_id = rim.inventory_stock_id
      AND LOWER(TRIM(cm.recipe_ingredient_name)) = LOWER(TRIM(rim.ingredient_name))
  );

-- Verification: Show what mappings were created
SELECT 
  'MAPPINGS CREATED' as report_type,
  COUNT(CASE WHEN LOWER(rim.ingredient_name) = 'rectangle' THEN 1 END) as rectangle_mappings_added,
  COUNT(CASE WHEN LOWER(rim.ingredient_name) = 'coke' THEN 1 END) as coke_mappings_added,
  COUNT(*) as total_mappings_added
FROM recipe_ingredient_mappings rim
WHERE rim.created_at > NOW() - INTERVAL '1 minute';