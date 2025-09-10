-- COMPLETE INGREDIENT CORRECTIONS FOR INVENTORY DEDUCTION (ENUM-CORRECTED)
-- Handle existing mappings and use correct enum values

-- Step 1: Clean up existing duplicate or conflicting mappings first
DELETE FROM recipe_ingredient_mappings 
WHERE ingredient_name IN ('Espresso Shot', 'Bending Straws', 'Oreo', 'Crushed Oreo', 'Choco Flakes');

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

-- Update syrup quantities to 10ml
UPDATE recipe_ingredients 
SET 
    quantity = 10,
    unit = 'ml',
    updated_at = NOW()
WHERE ingredient_name IN ('Vanilla Syrup', 'Chocolate Syrup', 'Strawberry Syrup', 'Caramel Syrup', 'Hazelnut Syrup')
    AND recipe_id IN (SELECT id FROM recipes WHERE is_active = true);

-- Update milk quantity to 120ml
UPDATE recipe_ingredients 
SET 
    quantity = 120,
    unit = 'ml',
    updated_at = NOW()
WHERE ingredient_name = 'Milk'
    AND recipe_id IN (SELECT id FROM recipes WHERE is_active = true);

-- Update powder quantities to 15g
UPDATE recipe_ingredients 
SET 
    quantity = 15,
    unit = 'g',
    updated_at = NOW()
WHERE ingredient_name IN ('Monalisa', 'Matcha Powder', 'Frappe Powder', 'Iced Tea Powder', 'Lemonade Powder')
    AND recipe_id IN (SELECT id FROM recipes WHERE is_active = true);

-- Update Choco Flakes to pieces
UPDATE recipe_ingredients 
SET 
    ingredient_name = 'Choco Flakes',
    quantity = 3,
    unit = 'pieces',
    updated_at = NOW()
WHERE ingredient_name = 'Choco Flakes'
    AND recipe_id IN (SELECT id FROM recipes WHERE is_active = true);

-- Update Oreo ingredients to standardized name and pieces
UPDATE recipe_ingredients 
SET 
    ingredient_name = 'Oreo Cookie',
    quantity = 2,
    unit = 'pieces',
    updated_at = NOW()
WHERE ingredient_name IN ('Oreo', 'Crushed Oreo')
    AND recipe_id IN (SELECT id FROM recipes WHERE is_active = true);

-- Step 3: Create missing inventory stock items with correct enum values
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
    1000, -- Start with 1kg stock
    100,  -- 100g minimum threshold
    0.50, -- ₱0.50 per gram
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
    500, -- Start with 500 straws
    50,  -- 50 pieces minimum threshold
    0.50, -- ₱0.50 per straw
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

-- Step 4: Create ingredient mappings for corrected ingredients with conflict handling
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
JOIN inventory_stock ist ON ist.store_id = r.store_id AND ist.item = 'Coffee Beans'
WHERE r.is_active = true
    AND EXISTS (
        SELECT 1 FROM recipe_ingredients ri 
        WHERE ri.recipe_id = r.id 
        AND ri.ingredient_name = 'Coffee Beans'
    )
ON CONFLICT (recipe_id, ingredient_name) DO UPDATE SET
    inventory_stock_id = EXCLUDED.inventory_stock_id,
    updated_at = NOW();

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
    'Bending Straw',
    ist.id,
    1.0,
    NOW(),
    NOW()
FROM recipes r
JOIN inventory_stock ist ON ist.store_id = r.store_id AND ist.item = 'Bending Straw'
WHERE r.is_active = true
    AND EXISTS (
        SELECT 1 FROM recipe_ingredients ri 
        WHERE ri.recipe_id = r.id 
        AND ri.ingredient_name = 'Bending Straw'
    )
ON CONFLICT (recipe_id, ingredient_name) DO UPDATE SET
    inventory_stock_id = EXCLUDED.inventory_stock_id,
    updated_at = NOW();

-- Step 5: Create mappings for other corrected ingredients where inventory exists
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
    ri.ingredient_name,
    ist.id,
    1.0,
    NOW(),
    NOW()
FROM recipes r
JOIN recipe_ingredients ri ON ri.recipe_id = r.id
JOIN inventory_stock ist ON (
    ist.store_id = r.store_id 
    AND ist.is_active = true
    AND (
        -- Exact matches
        ist.item = ri.ingredient_name
        OR
        -- Syrup mappings (case insensitive)
        (ri.ingredient_name LIKE '%Syrup' AND LOWER(ist.item) LIKE '%' || LOWER(REPLACE(ri.ingredient_name, ' Syrup', '')) || '%')
        OR
        -- Powder mappings (case insensitive)
        (ri.ingredient_name LIKE '%Powder' AND LOWER(ist.item) LIKE '%' || LOWER(REPLACE(ri.ingredient_name, ' Powder', '')) || '%')
        OR
        -- Milk mapping
        (ri.ingredient_name = 'Milk' AND LOWER(ist.item) LIKE '%milk%')
        OR
        -- Flakes mapping
        (ri.ingredient_name = 'Choco Flakes' AND LOWER(ist.item) LIKE '%flakes%')
        OR
        -- Oreo mapping
        (ri.ingredient_name = 'Oreo Cookie' AND LOWER(ist.item) LIKE '%oreo%')
    )
)
WHERE r.is_active = true
    AND ri.ingredient_name IN ('Vanilla Syrup', 'Chocolate Syrup', 'Strawberry Syrup', 'Caramel Syrup', 'Hazelnut Syrup', 'Milk', 'Monalisa', 'Matcha Powder', 'Frappe Powder', 'Iced Tea Powder', 'Lemonade Powder', 'Choco Flakes', 'Oreo Cookie')
ON CONFLICT (recipe_id, ingredient_name) DO UPDATE SET
    inventory_stock_id = EXCLUDED.inventory_stock_id,
    updated_at = NOW();

-- Step 6: Update recipe costs after ingredient corrections
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

-- Final verification: Show completion status
SELECT 
    'INGREDIENT CORRECTION COMPLETED' as status,
    'Recipe ingredients and mappings updated - inventory deduction ready' as message,
    (SELECT COUNT(*) FROM recipe_ingredients WHERE ingredient_name IN ('Coffee Beans', 'Bending Straw', 'Vanilla Syrup', 'Chocolate Syrup', 'Milk', 'Choco Flakes', 'Oreo Cookie')) as updated_ingredients,
    (SELECT COUNT(*) FROM recipe_ingredient_mappings WHERE ingredient_name IN ('Coffee Beans', 'Bending Straw', 'Vanilla Syrup', 'Chocolate Syrup', 'Milk', 'Choco Flakes', 'Oreo Cookie')) as active_mappings,
    (SELECT COUNT(*) FROM inventory_stock WHERE item IN ('Coffee Beans', 'Bending Straw') AND recipe_compatible = true) as new_inventory_items;