-- FINAL CORRECTED: Fix inventory deduction issues with proper type casting

-- Clean up duplicate recipe ingredients  
WITH duplicate_ingredients AS (
    SELECT 
        recipe_id,
        ingredient_name,
        (array_agg(id ORDER BY created_at ASC))[1] as keep_id
    FROM recipe_ingredients 
    WHERE inventory_stock_id IS NOT NULL
    GROUP BY recipe_id, ingredient_name
    HAVING COUNT(*) > 1
)
DELETE FROM recipe_ingredients ri
WHERE EXISTS (
    SELECT 1 FROM duplicate_ingredients di 
    WHERE di.recipe_id = ri.recipe_id 
    AND di.ingredient_name = ri.ingredient_name 
    AND ri.id != di.keep_id
);

-- Add missing inventory items with proper enum casting
INSERT INTO inventory_stock (store_id, item, unit, stock_quantity, minimum_threshold, is_active, item_category)
SELECT DISTINCT 
    'e78ad702-1135-482d-a508-88104e2706cf'::UUID as store_id,
    item_name,
    'pieces' as unit,
    50 as stock_quantity,
    10 as minimum_threshold,
    true as is_active,
    'premium_topping'::inventory_item_category as item_category
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

-- Fix missing inventory mappings
UPDATE recipe_ingredients 
SET inventory_stock_id = ist.id,
    updated_at = NOW()
FROM inventory_stock ist
WHERE recipe_ingredients.inventory_stock_id IS NULL
AND ist.item = recipe_ingredients.ingredient_name 
AND ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'::UUID
AND ist.is_active = true;

-- Add Strawberry Syrup to Oreo Strawberry Blended recipe
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, inventory_stock_id)
SELECT DISTINCT
    r.id as recipe_id,
    'Strawberry Syrup' as ingredient_name,
    30 as quantity,
    'ml' as unit,
    ist.id as inventory_stock_id
FROM recipes r
JOIN inventory_stock ist ON ist.item = 'Strawberry Syrup' 
    AND ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'::UUID
WHERE r.name = 'Oreo Strawberry Blended'
AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri 
    WHERE ri.recipe_id = r.id 
    AND ri.ingredient_name = 'Strawberry Syrup'
);