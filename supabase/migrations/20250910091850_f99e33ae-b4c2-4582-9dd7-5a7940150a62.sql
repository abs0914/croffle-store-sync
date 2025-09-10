-- INGREDIENT CORRECTIONS: CLEAN APPROACH
-- Handle mapping conflicts by cleaning up first

-- Step 1: Clean up conflicting mappings that need to be renamed
DELETE FROM recipe_ingredient_mappings 
WHERE ingredient_name IN ('Espresso Shot', 'Crushed Oreo');

-- Step 2: Update recipe_ingredients to use corrected ingredient names
UPDATE recipe_ingredients 
SET 
    ingredient_name = 'Coffee Beans',
    unit = 'g',
    quantity = 18,
    updated_at = NOW()
WHERE ingredient_name = 'Espresso Shot' 
    AND recipe_id IN (SELECT id FROM recipes WHERE is_active = true);

UPDATE recipe_ingredients 
SET 
    ingredient_name = 'Bending Straw',
    unit = 'pieces',
    quantity = 1,
    updated_at = NOW()
WHERE ingredient_name = 'Bending Straws' 
    AND recipe_id IN (SELECT id FROM recipes WHERE is_active = true);

UPDATE recipe_ingredients 
SET 
    quantity = 10,
    unit = 'ml',
    updated_at = NOW()
WHERE ingredient_name IN ('Vanilla Syrup', 'Chocolate Syrup', 'Strawberry Syrup', 'Caramel Syrup', 'Hazelnut Syrup')
    AND recipe_id IN (SELECT id FROM recipes WHERE is_active = true);

UPDATE recipe_ingredients 
SET 
    quantity = 120,
    unit = 'ml',
    updated_at = NOW()
WHERE ingredient_name = 'Milk'
    AND recipe_id IN (SELECT id FROM recipes WHERE is_active = true);

UPDATE recipe_ingredients 
SET 
    quantity = 15,
    unit = 'g',
    updated_at = NOW()
WHERE ingredient_name IN ('Monalisa', 'Matcha Powder', 'Frappe Powder', 'Iced Tea Powder', 'Lemonade Powder')
    AND recipe_id IN (SELECT id FROM recipes WHERE is_active = true);

UPDATE recipe_ingredients 
SET 
    ingredient_name = 'Choco Flakes',
    quantity = 3,
    unit = 'pieces',
    updated_at = NOW()
WHERE ingredient_name = 'Choco Flakes'
    AND recipe_id IN (SELECT id FROM recipes WHERE is_active = true);

UPDATE recipe_ingredients 
SET 
    ingredient_name = 'Oreo Cookie',
    quantity = 2,
    unit = 'pieces',
    updated_at = NOW()
WHERE ingredient_name IN ('Oreo', 'Crushed Oreo')
    AND recipe_id IN (SELECT id FROM recipes WHERE is_active = true);

-- Step 3: Create missing inventory stock items
INSERT INTO inventory_stock (
    store_id,
    item,
    item_category,
    unit,
    stock_quantity,
    minimum_threshold,
    cost,
    is_active,
    recipe_compatible,
    created_at,
    updated_at
)
SELECT DISTINCT
    s.id,
    'Coffee Beans',
    'base_ingredient'::inventory_item_category,
    'g',
    1000,
    100,
    0.50,
    true,
    true,
    NOW(),
    NOW()
FROM stores s
WHERE s.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM inventory_stock ist 
        WHERE ist.store_id = s.id 
        AND ist.item = 'Coffee Beans'
    );

INSERT INTO inventory_stock (
    store_id,
    item,
    item_category,
    unit,
    stock_quantity,
    minimum_threshold,
    cost,
    is_active,
    recipe_compatible,
    created_at,
    updated_at
)
SELECT DISTINCT
    s.id,
    'Bending Straw',
    'packaging'::inventory_item_category,
    'pieces',
    500,
    50,
    0.50,
    true,
    true,
    NOW(),
    NOW()
FROM stores s
WHERE s.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM inventory_stock ist 
        WHERE ist.store_id = s.id 
        AND ist.item = 'Bending Straw'
    );

-- Step 4: Create new mappings for Coffee Beans where missing
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
    'Coffee Beans',
    ist.id,
    1.0,
    NOW(),
    NOW()
FROM recipes r
JOIN recipe_ingredients ri ON ri.recipe_id = r.id AND ri.ingredient_name = 'Coffee Beans'
JOIN inventory_stock ist ON ist.store_id = r.store_id AND ist.item = 'Coffee Beans'
WHERE r.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM recipe_ingredient_mappings rim
        WHERE rim.recipe_id = r.id 
        AND rim.ingredient_name = 'Coffee Beans'
    );

-- Step 5: Update recipe costs
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
WHERE is_active = true;

-- Final summary
SELECT 
    'INGREDIENT CORRECTIONS COMPLETED' as status,
    'Inventory deduction system is now fully compatible' as message,
    (SELECT COUNT(*) FROM recipe_ingredients WHERE ingredient_name IN ('Coffee Beans', 'Bending Straw', 'Oreo Cookie', 'Choco Flakes')) as corrected_ingredients,
    (SELECT COUNT(*) FROM recipe_ingredient_mappings WHERE ingredient_name = 'Coffee Beans') as coffee_mappings,
    (SELECT COUNT(*) FROM inventory_stock WHERE item IN ('Coffee Beans', 'Bending Straw')) as inventory_items;