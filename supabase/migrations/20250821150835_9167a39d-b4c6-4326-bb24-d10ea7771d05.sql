-- Step 6: Remove duplicate recipes and fix catalog mappings

-- Remove duplicate recipes (keep one per name/store combination with the best data)
DELETE FROM unified_recipe_ingredients 
WHERE recipe_id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY name, store_id 
             ORDER BY 
               CASE WHEN total_cost > 0 THEN 1 ELSE 2 END,
               updated_at DESC
           ) as rn
    FROM unified_recipes
    WHERE store_id IS NOT NULL
  ) ranked_recipes
  WHERE rn > 1
);

DELETE FROM unified_recipes 
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY name, store_id 
             ORDER BY 
               CASE WHEN total_cost > 0 THEN 1 ELSE 2 END,
               updated_at DESC
           ) as rn
    FROM unified_recipes
    WHERE store_id IS NOT NULL
  ) ranked_recipes
  WHERE rn > 1
);

-- Step 7: Update product catalog to point to the correct unified recipes
UPDATE product_catalog 
SET recipe_id = kept_recipes.id,
    updated_at = NOW()
FROM (
  SELECT DISTINCT ON (ur.name, ur.store_id)
    ur.id,
    ur.name,
    ur.store_id
  FROM unified_recipes ur
  WHERE ur.store_id IS NOT NULL
  ORDER BY ur.name, ur.store_id, ur.total_cost DESC, ur.updated_at DESC
) AS kept_recipes
WHERE product_catalog.product_name = kept_recipes.name 
AND product_catalog.store_id = kept_recipes.store_id;

-- Step 8: Create missing inventory items for ingredients that don't exist
INSERT INTO inventory_stock (store_id, item, unit, stock_quantity, cost, minimum_threshold, maximum_capacity, is_active)
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
  100 as stock_quantity,  -- Set reasonable starting stock
  uri.cost_per_unit,
  20 as minimum_threshold,
  500 as maximum_capacity,
  true
FROM unified_recipe_ingredients uri
JOIN unified_recipes ur ON uri.recipe_id = ur.id
WHERE ur.store_id IS NOT NULL
AND uri.ingredient_name != 'Unknown Ingredient'
AND NOT EXISTS (
  SELECT 1 FROM inventory_stock ist 
  WHERE ist.store_id = ur.store_id 
  AND LOWER(TRIM(ist.item)) = LOWER(TRIM(uri.ingredient_name))
  AND ist.is_active = true
)
ON CONFLICT (store_id, item) DO UPDATE SET
  cost = EXCLUDED.cost,
  is_active = true,
  updated_at = NOW();

-- Step 9: Update products table to sync with unified recipes
UPDATE products 
SET 
  cost = ur.total_cost,
  price = CASE 
    WHEN products.price = 0 OR products.price IS NULL 
    THEN ur.total_cost * 2.5  -- Apply 150% markup for missing prices
    ELSE products.price  -- Keep existing prices
  END,
  updated_at = NOW()
FROM unified_recipes ur
JOIN product_catalog pc ON ur.id = pc.recipe_id
WHERE products.name = pc.product_name 
AND products.store_id = pc.store_id
AND ur.total_cost > 0;