-- Fix Recipe and Ingredient Mapping Issues
-- This migration addresses critical data integrity problems:
-- 1. Populate missing ingredient names (84% of recipe ingredients)
-- 2. Re-enable incorrectly disabled products
-- 3. Fix incorrect recipe mappings
-- 4. Ensure consistency between templates and deployed recipes

-- Step 1: Populate missing ingredient names in recipe_ingredients
-- Update recipe_ingredients to fill in missing ingredient_name by joining with inventory_stock
UPDATE recipe_ingredients 
SET ingredient_name = ist.item
FROM inventory_stock ist
WHERE recipe_ingredients.inventory_stock_id = ist.id 
  AND (recipe_ingredients.ingredient_name IS NULL OR recipe_ingredients.ingredient_name = '');

-- Step 2: Update cost_per_unit for recipe ingredients where missing
UPDATE recipe_ingredients 
SET cost_per_unit = ist.cost
FROM inventory_stock ist
WHERE recipe_ingredients.inventory_stock_id = ist.id 
  AND (recipe_ingredients.cost_per_unit IS NULL OR recipe_ingredients.cost_per_unit = 0)
  AND ist.cost IS NOT NULL 
  AND ist.cost > 0;

-- Step 3: Re-enable Croffle products in Robinsons North that were incorrectly disabled
UPDATE product_catalog 
SET is_available = true,
    updated_at = NOW()
WHERE store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86' -- Robinsons North
  AND product_name ILIKE '%croffle%'
  AND is_available = false;

-- Step 4: Re-enable other products that may have been disabled due to ingredient validation failures
UPDATE product_catalog 
SET is_available = true,
    updated_at = NOW()
WHERE is_available = false
  AND product_name IN (
    'Coke', 'Sprite', 'Bottled Water', 
    'Vanilla Ice Cream', 'Chocolate Sauce'
  );

-- Step 5: Update recipe total costs based on corrected ingredient data
UPDATE recipes 
SET total_cost = (
  SELECT COALESCE(SUM(ri.quantity * COALESCE(ri.cost_per_unit, 0)), 0)
  FROM recipe_ingredients ri
  WHERE ri.recipe_id = recipes.id
),
cost_per_serving = (
  SELECT COALESCE(SUM(ri.quantity * COALESCE(ri.cost_per_unit, 0)), 0) / GREATEST(recipes.serving_size, 1)
  FROM recipe_ingredients ri
  WHERE ri.recipe_id = recipes.id
),
updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM recipe_ingredients ri 
  WHERE ri.recipe_id = recipes.id
);

-- Step 6: Fix any orphaned recipe ingredients (ingredients without valid inventory references)
DELETE FROM recipe_ingredients 
WHERE inventory_stock_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM inventory_stock ist 
    WHERE ist.id = recipe_ingredients.inventory_stock_id
  );

-- Step 7: Ensure product catalog items have proper recipe references
UPDATE product_catalog 
SET recipe_id = r.id,
    updated_at = NOW()
FROM recipes r
WHERE r.name = product_catalog.product_name
  AND r.store_id = product_catalog.store_id
  AND product_catalog.recipe_id IS NULL;

-- Step 8: Create audit log for this data fix
INSERT INTO inventory_movements (
  inventory_stock_id,
  movement_type,
  quantity_change,
  previous_quantity,
  new_quantity,
  notes,
  created_by
)
SELECT 
  ist.id,
  'data_correction',
  0,
  ist.stock_quantity,
  ist.stock_quantity,
  'Recipe ingredient mapping data correction - populated missing ingredient names and fixed product availability',
  (SELECT user_id FROM app_users WHERE role = 'admin' LIMIT 1)
FROM inventory_stock ist
WHERE EXISTS (
  SELECT 1 FROM recipe_ingredients ri 
  WHERE ri.inventory_stock_id = ist.id
);

-- Step 9: Verify data integrity - this will help us monitor the fix
CREATE TEMP TABLE data_integrity_report AS
SELECT 
  'Missing ingredient names' as issue_type,
  COUNT(*) as count,
  'recipe_ingredients with NULL ingredient_name' as description
FROM recipe_ingredients 
WHERE ingredient_name IS NULL OR ingredient_name = ''

UNION ALL

SELECT 
  'Disabled products' as issue_type,
  COUNT(*) as count,
  'product_catalog items with is_available = false' as description
FROM product_catalog 
WHERE is_available = false

UNION ALL

SELECT 
  'Recipes without ingredients' as issue_type,
  COUNT(*) as count,
  'recipes with no associated ingredients' as description
FROM recipes r
WHERE NOT EXISTS (
  SELECT 1 FROM recipe_ingredients ri 
  WHERE ri.recipe_id = r.id
)

UNION ALL

SELECT 
  'Products without recipes' as issue_type,
  COUNT(*) as count,
  'product_catalog items without recipe_id' as description
FROM product_catalog 
WHERE recipe_id IS NULL AND product_name NOT IN ('Coke', 'Sprite', 'Bottled Water');

-- Output the report
SELECT * FROM data_integrity_report ORDER BY count DESC;