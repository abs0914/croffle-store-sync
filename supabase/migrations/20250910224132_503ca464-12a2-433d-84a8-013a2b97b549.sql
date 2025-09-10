-- Add Rectangle ingredient to all regular croffle recipes that don't have it
-- This ensures all regular croffles (including Matcha, Nutella, etc.) deduct Rectangle

-- Step 1: Add Rectangle ingredient to all regular croffle recipes missing it
INSERT INTO recipe_ingredients (
  recipe_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit,
  created_at,
  updated_at
)
SELECT DISTINCT
  r.id as recipe_id,
  'Rectangle' as ingredient_name,
  1 as quantity,
  'pieces'::inventory_unit as unit,
  0 as cost_per_unit,
  NOW() as created_at,
  NOW() as updated_at
FROM recipes r
WHERE r.name ILIKE '%croffle%'
  AND r.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri 
    WHERE ri.recipe_id = r.id 
    AND LOWER(TRIM(ri.ingredient_name)) = 'rectangle'
  )
  AND r.name NOT ILIKE '%mini%'; -- Exclude mini croffles

-- Step 2: Create recipe ingredient mappings for the new Rectangle ingredients
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
  'Rectangle' as ingredient_name,
  ist.id as inventory_stock_id,
  1.0 as conversion_factor,
  NOW() as created_at,
  NOW() as updated_at
FROM recipe_ingredients ri
JOIN recipes r ON r.id = ri.recipe_id
JOIN inventory_stock ist ON ist.store_id = r.store_id
WHERE LOWER(TRIM(ri.ingredient_name)) = 'rectangle'
  AND LOWER(TRIM(ist.item)) = 'rectangle'
  AND ist.is_active = true
  AND ri.created_at > NOW() - INTERVAL '1 minute' -- Only for newly added ingredients
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredient_mappings rim
    WHERE rim.recipe_id = ri.recipe_id 
      AND LOWER(TRIM(rim.ingredient_name)) = 'rectangle'
  );

-- Step 3: Create conversion mappings for the new Rectangle mappings
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
  'Rectangle' as recipe_ingredient_name,
  'pieces' as recipe_ingredient_unit,
  1.0 as conversion_factor,
  'Auto-generated for regular croffle recipes' as notes,
  NOW() as created_at,
  NOW() as updated_at
FROM recipe_ingredient_mappings rim
WHERE rim.created_at > NOW() - INTERVAL '1 minute'
  AND LOWER(TRIM(rim.ingredient_name)) = 'rectangle'
  AND NOT EXISTS (
    SELECT 1 FROM conversion_mappings cm
    WHERE cm.inventory_stock_id = rim.inventory_stock_id
      AND LOWER(TRIM(cm.recipe_ingredient_name)) = 'rectangle'
  );

-- Verification: Show what was added
SELECT 
  'RECTANGLE INGREDIENTS ADDED' as report_type,
  COUNT(*) as ingredients_added,
  COUNT(DISTINCT r.id) as recipes_updated,
  array_agg(DISTINCT r.name ORDER BY r.name) as updated_recipes
FROM recipe_ingredients ri
JOIN recipes r ON r.id = ri.recipe_id
WHERE LOWER(TRIM(ri.ingredient_name)) = 'rectangle'
  AND ri.created_at > NOW() - INTERVAL '1 minute';