-- COMPREHENSIVE CLEANUP: Consolidate and remove all "Coffee Beands" references

-- Step 1: Consolidate inventory quantities where both "Coffee Beans" and "Coffee Beands" exist
WITH consolidation AS (
  SELECT 
    cb.store_id,
    cb.id as coffee_beans_id,
    cband.id as coffee_beands_id,
    cb.stock_quantity + COALESCE(cband.stock_quantity, 0) as total_quantity,
    GREATEST(cb.cost, COALESCE(cband.cost, 0)) as best_cost,
    GREATEST(cb.minimum_threshold, COALESCE(cband.minimum_threshold, 0)) as best_threshold
  FROM inventory_stock cb
  LEFT JOIN inventory_stock cband ON cband.store_id = cb.store_id 
    AND LOWER(cband.item) = LOWER('Coffee Beands') 
    AND cband.is_active = true
  WHERE LOWER(cb.item) = LOWER('Coffee Beans') 
    AND cb.is_active = true
    AND cband.id IS NOT NULL
)
UPDATE inventory_stock 
SET stock_quantity = consolidation.total_quantity,
    cost = consolidation.best_cost,
    minimum_threshold = consolidation.best_threshold,
    updated_at = NOW()
FROM consolidation
WHERE inventory_stock.id = consolidation.coffee_beans_id;

-- Step 2: Delete all "Coffee Beands" entries from inventory_stock
DELETE FROM inventory_stock 
WHERE LOWER(item) = LOWER('Coffee Beands') AND is_active = true;

-- Step 3: Update "Coffee Beands" to "Coffee Beans" in stores that only have "Coffee Beands" 
UPDATE inventory_stock 
SET item = 'Coffee Beans',
    updated_at = NOW()
WHERE LOWER(item) = LOWER('Coffee Beands');

-- Step 4: Update recipe_ingredients table
UPDATE recipe_ingredients 
SET ingredient_name = 'Coffee Beans',
    updated_at = NOW()
WHERE LOWER(ingredient_name) = LOWER('Coffee Beands');

-- Step 5: Update recipe_ingredient_mappings table
UPDATE recipe_ingredient_mappings 
SET ingredient_name = 'Coffee Beans',
    updated_at = NOW()
WHERE LOWER(ingredient_name) = LOWER('Coffee Beands');

-- Step 6: Update recipe_template_ingredients table
UPDATE recipe_template_ingredients 
SET ingredient_name = 'Coffee Beans',
    updated_at = NOW()
WHERE LOWER(ingredient_name) = LOWER('Coffee Beands');

-- Step 7: Update standardized_ingredients table if it exists
UPDATE standardized_ingredients 
SET ingredient_name = 'Coffee Beans',
    standardized_name = 'Coffee Beans'
WHERE LOWER(ingredient_name) = LOWER('Coffee Beands') 
   OR LOWER(standardized_name) = LOWER('Coffee Beands');

-- Step 8: Final cleanup verification
SELECT 
    'COFFEE BEANDS CLEANUP COMPLETE' as status,
    (SELECT COUNT(*) FROM inventory_stock WHERE LOWER(item) LIKE '%coffee beands%') as coffee_beands_remaining,
    (SELECT COUNT(*) FROM inventory_stock WHERE LOWER(item) = LOWER('Coffee Beans') AND is_active = true) as coffee_beans_total,
    (SELECT COUNT(*) FROM recipe_ingredients WHERE LOWER(ingredient_name) LIKE '%coffee beands%') as recipe_ingredients_beands,
    (SELECT COUNT(*) FROM recipe_ingredient_mappings WHERE LOWER(ingredient_name) LIKE '%coffee beands%') as mappings_beands;