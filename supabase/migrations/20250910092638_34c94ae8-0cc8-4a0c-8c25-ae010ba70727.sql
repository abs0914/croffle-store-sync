-- COMPREHENSIVE CLEANUP: Remove all "Coffee Beands" references, keep only "Coffee Beans"

-- Step 1: Update inventory_stock table
UPDATE inventory_stock 
SET item = 'Coffee Beans',
    updated_at = NOW()
WHERE LOWER(item) = LOWER('Coffee Beands') AND is_active = true;

-- Step 2: Update recipe_ingredients table
UPDATE recipe_ingredients 
SET ingredient_name = 'Coffee Beans',
    updated_at = NOW()
WHERE LOWER(ingredient_name) = LOWER('Coffee Beands');

-- Step 3: Update recipe_ingredient_mappings table
UPDATE recipe_ingredient_mappings 
SET ingredient_name = 'Coffee Beans',
    updated_at = NOW()
WHERE LOWER(ingredient_name) = LOWER('Coffee Beands');

-- Step 4: Update recipe_template_ingredients table
UPDATE recipe_template_ingredients 
SET ingredient_name = 'Coffee Beans',
    updated_at = NOW()
WHERE LOWER(ingredient_name) = LOWER('Coffee Beands');

-- Step 5: Update standardized_ingredients table if it exists
UPDATE standardized_ingredients 
SET ingredient_name = 'Coffee Beans',
    standardized_name = 'Coffee Beans',
    updated_at = NOW()
WHERE LOWER(ingredient_name) = LOWER('Coffee Beands') 
   OR LOWER(standardized_name) = LOWER('Coffee Beands');

-- Step 6: Delete any duplicate entries that might have been created
-- Remove any remaining "Coffee Beands" inventory entries after consolidation
DELETE FROM inventory_stock 
WHERE LOWER(item) = LOWER('Coffee Beands') AND is_active = true
AND EXISTS (
    SELECT 1 FROM inventory_stock ist2 
    WHERE ist2.store_id = inventory_stock.store_id 
    AND LOWER(ist2.item) = LOWER('Coffee Beans')
    AND ist2.is_active = true
    AND ist2.id != inventory_stock.id
);

-- Step 7: Verify cleanup - show final status
WITH cleanup_verification AS (
    SELECT 
        'inventory_stock' as table_name,
        COUNT(*) as coffee_beands_count,
        (SELECT COUNT(*) FROM inventory_stock WHERE LOWER(item) = LOWER('Coffee Beans') AND is_active = true) as coffee_beans_count
    FROM inventory_stock 
    WHERE LOWER(item) = LOWER('Coffee Beands') AND is_active = true
    
    UNION ALL
    
    SELECT 
        'recipe_ingredients' as table_name,
        COUNT(*) as coffee_beands_count,
        (SELECT COUNT(*) FROM recipe_ingredients WHERE LOWER(ingredient_name) = LOWER('Coffee Beans')) as coffee_beans_count
    FROM recipe_ingredients 
    WHERE LOWER(ingredient_name) = LOWER('Coffee Beands')
    
    UNION ALL
    
    SELECT 
        'recipe_ingredient_mappings' as table_name,
        COUNT(*) as coffee_beands_count,
        (SELECT COUNT(*) FROM recipe_ingredient_mappings WHERE LOWER(ingredient_name) = LOWER('Coffee Beans')) as coffee_beans_count
    FROM recipe_ingredient_mappings 
    WHERE LOWER(ingredient_name) = LOWER('Coffee Beands')
)
SELECT 
    'COFFEE BEANDS CLEANUP COMPLETE' as status,
    json_agg(
        json_build_object(
            'table', table_name,
            'coffee_beands_remaining', coffee_beands_count,
            'coffee_beans_total', coffee_beans_count
        )
    ) as cleanup_summary
FROM cleanup_verification;