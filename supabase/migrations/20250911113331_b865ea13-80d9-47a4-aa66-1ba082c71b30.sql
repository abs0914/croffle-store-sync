-- CORRECTED: Fix inventory deduction issues with proper UUID casting
-- Clean up duplicate ingredients and add missing mappings

-- Execute deduplication with proper UUID handling
WITH duplicate_ingredients AS (
    SELECT 
        recipe_id,
        ingredient_name,
        (array_agg(id ORDER BY created_at ASC))[1] as keep_id,
        COUNT(*) as duplicate_count
    FROM recipe_ingredients 
    WHERE inventory_stock_id IS NOT NULL
    GROUP BY recipe_id, ingredient_name
    HAVING COUNT(*) > 1
),
deletions AS (
    DELETE FROM recipe_ingredients ri
    WHERE EXISTS (
        SELECT 1 FROM duplicate_ingredients di 
        WHERE di.recipe_id = ri.recipe_id 
        AND di.ingredient_name = ri.ingredient_name 
        AND ri.id != di.keep_id
    )
    RETURNING 1
)
SELECT 'Duplicate ingredients cleaned up' as status;

-- Add missing inventory items with proper UUID casting
INSERT INTO inventory_stock (store_id, item, unit, stock_quantity, minimum_threshold, is_active, item_category)
SELECT DISTINCT 
    'e78ad702-1135-482d-a508-88104e2706cf'::UUID as store_id,
    item_name,
    'pieces' as unit,
    50 as stock_quantity,
    10 as minimum_threshold,
    true as is_active,
    'beverage' as item_category
FROM (VALUES 
    ('Coke'),
    ('Sprite'), 
    ('Bottled Water'),
    ('Sugar Sachet')
) AS missing_items(item_name)
WHERE NOT EXISTS (
    SELECT 1 FROM inventory_stock 
    WHERE item = missing_items.item_name 
    AND store_id = 'e78ad702-1135-482d-a508-88104e2706cf'::UUID
);

-- Fix missing inventory mappings for existing unmapped ingredients
UPDATE recipe_ingredients 
SET inventory_stock_id = ist.id,
    updated_at = NOW()
FROM inventory_stock ist
WHERE recipe_ingredients.inventory_stock_id IS NULL
AND ist.item = recipe_ingredients.ingredient_name 
AND ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'::UUID
AND ist.is_active = true;

-- Add Strawberry Syrup to Oreo Strawberry Blended if missing  
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, inventory_stock_id, created_at, updated_at)
SELECT DISTINCT
    r.id as recipe_id,
    'Strawberry Syrup' as ingredient_name,
    30 as quantity,
    'ml' as unit,
    ist.id as inventory_stock_id,
    NOW() as created_at,
    NOW() as updated_at
FROM recipes r
JOIN inventory_stock ist ON ist.item = 'Strawberry Syrup' 
    AND ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'::UUID
    AND ist.is_active = true
WHERE r.name = 'Oreo Strawberry Blended'
AND r.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'::UUID
AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri 
    WHERE ri.recipe_id = r.id 
    AND ri.ingredient_name = 'Strawberry Syrup'
);