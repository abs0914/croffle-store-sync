-- Final recipe system fix (without ON CONFLICT)

-- Step 6: Remove duplicate recipes (keep the best one per name/store)
WITH recipes_to_delete AS (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY name, store_id 
             ORDER BY 
               CASE WHEN total_cost > 0 THEN 1 ELSE 2 END,
               updated_at DESC
           ) as rn
    FROM unified_recipes
    WHERE store_id IS NOT NULL
  ) ranked
  WHERE rn > 1
)
DELETE FROM unified_recipe_ingredients 
WHERE recipe_id IN (SELECT id FROM recipes_to_delete);

WITH recipes_to_delete AS (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY name, store_id 
             ORDER BY 
               CASE WHEN total_cost > 0 THEN 1 ELSE 2 END,
               updated_at DESC
           ) as rn
    FROM unified_recipes
    WHERE store_id IS NOT NULL
  ) ranked
  WHERE rn > 1
)
DELETE FROM unified_recipes 
WHERE id IN (SELECT id FROM recipes_to_delete);

-- Step 7: Create missing inventory items for recipe ingredients
INSERT INTO inventory_stock (store_id, item, unit, stock_quantity, cost, minimum_threshold, is_active)
SELECT DISTINCT
  ur.store_id,
  uri.ingredient_name,
  CASE 
    WHEN uri.ingredient_name ILIKE '%coffee%' OR uri.ingredient_name ILIKE '%bean%' THEN 'kg'
    WHEN uri.ingredient_name ILIKE '%milk%' OR uri.ingredient_name ILIKE '%cream%' THEN 'liters'
    WHEN uri.ingredient_name ILIKE '%syrup%' OR uri.ingredient_name ILIKE '%sauce%' THEN 'ml'
    WHEN uri.ingredient_name ILIKE '%powder%' OR uri.ingredient_name ILIKE '%sugar%' THEN 'g'
    WHEN uri.ingredient_name ILIKE '%jam%' OR uri.ingredient_name ILIKE '%spread%' THEN 'g'
    ELSE 'pieces'
  END as unit,
  100 as stock_quantity,
  uri.cost_per_unit,
  20 as minimum_threshold,
  true
FROM unified_recipe_ingredients uri
JOIN unified_recipes ur ON uri.recipe_id = ur.id
WHERE ur.store_id IS NOT NULL
AND uri.ingredient_name != 'Unknown Ingredient'
AND uri.ingredient_name IS NOT NULL 
AND TRIM(uri.ingredient_name) != ''
AND NOT EXISTS (
  SELECT 1 FROM inventory_stock ist 
  WHERE ist.store_id = ur.store_id 
  AND LOWER(TRIM(ist.item)) = LOWER(TRIM(uri.ingredient_name))
  AND ist.is_active = true
);

-- Step 8: Update existing products with accurate recipe costs
UPDATE products 
SET 
  cost = ur.total_cost,
  price = CASE 
    WHEN products.price = 0 OR products.price IS NULL 
    THEN GREATEST(ur.total_cost * 2.5, 50)  -- Minimum price of 50
    ELSE products.price
  END,
  updated_at = NOW()
FROM unified_recipes ur
WHERE products.recipe_id = ur.id
AND ur.total_cost > 0;

-- Step 9: Verify and validate the integration
SELECT 
  'Fix completed successfully' as status,
  COUNT(DISTINCT ur.id) as unique_recipes,
  COUNT(DISTINCT uri.ingredient_name) as unique_ingredients,
  AVG(ur.total_cost) as avg_recipe_cost
FROM unified_recipes ur
LEFT JOIN unified_recipe_ingredients uri ON ur.id = uri.recipe_id
WHERE ur.store_id IS NOT NULL;