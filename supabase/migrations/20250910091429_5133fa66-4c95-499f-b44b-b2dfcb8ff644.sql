-- COMPLETE INGREDIENT CORRECTIONS FOR INVENTORY DEDUCTION
-- Update recipe_ingredients and recipe_ingredient_mappings to match corrected template ingredients

-- Step 1: Update recipe_ingredients to use corrected ingredient names
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

-- Update syrup quantities to 10ml for all syrups
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

-- Update Choco Flakes and Oreo to pieces
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

-- Step 2: Update recipe_ingredient_mappings to use corrected ingredient names
UPDATE recipe_ingredient_mappings 
SET 
    ingredient_name = 'Coffee Beans',
    updated_at = NOW()
WHERE ingredient_name = 'Espresso Shot';

UPDATE recipe_ingredient_mappings 
SET 
    ingredient_name = 'Bending Straw',
    updated_at = NOW()
WHERE ingredient_name = 'Bending Straws';

UPDATE recipe_ingredient_mappings 
SET 
    ingredient_name = 'Choco Flakes',
    updated_at = NOW()
WHERE ingredient_name = 'Choco Flakes';

UPDATE recipe_ingredient_mappings 
SET 
    ingredient_name = 'Oreo Cookie',
    updated_at = NOW()
WHERE ingredient_name IN ('Oreo', 'Crushed Oreo');

-- Step 3: Create missing inventory stock items for corrected ingredients
-- Insert Coffee Beans inventory for all active stores if not exists
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
    'base'::inventory_item_category,
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

-- Insert Bending Straw inventory for all active stores if not exists
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

-- Step 4: Create ingredient mappings for corrected ingredients
-- Map Coffee Beans to inventory stock
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
    AND NOT EXISTS (
        SELECT 1 FROM recipe_ingredient_mappings rim
        WHERE rim.recipe_id = r.id 
        AND rim.ingredient_name = 'Coffee Beans'
    );

-- Map Bending Straw to inventory stock
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
    AND NOT EXISTS (
        SELECT 1 FROM recipe_ingredient_mappings rim
        WHERE rim.recipe_id = r.id 
        AND rim.ingredient_name = 'Bending Straw'
    );

-- Step 5: Verify mapping completeness and create missing mappings for existing inventory
-- Create mappings for syrups, milk, powders, etc. where inventory exists
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
        -- Syrup mappings
        (ri.ingredient_name LIKE '%Syrup' AND ist.item LIKE '%' || REPLACE(ri.ingredient_name, ' Syrup', '') || '%')
        OR
        -- Powder mappings  
        (ri.ingredient_name LIKE '%Powder' AND ist.item LIKE '%' || REPLACE(ri.ingredient_name, ' Powder', '') || '%')
        OR
        -- Milk mapping
        (ri.ingredient_name = 'Milk' AND ist.item LIKE '%Milk%')
        OR
        -- Flakes mapping
        (ri.ingredient_name = 'Choco Flakes' AND ist.item LIKE '%Flakes%')
        OR
        -- Oreo mapping
        (ri.ingredient_name = 'Oreo Cookie' AND ist.item LIKE '%Oreo%')
    )
)
WHERE r.is_active = true
    AND ri.ingredient_name IN ('Vanilla Syrup', 'Chocolate Syrup', 'Strawberry Syrup', 'Caramel Syrup', 'Hazelnut Syrup', 'Milk', 'Monalisa', 'Matcha Powder', 'Frappe Powder', 'Iced Tea Powder', 'Lemonade Powder', 'Choco Flakes', 'Oreo Cookie')
    AND NOT EXISTS (
        SELECT 1 FROM recipe_ingredient_mappings rim
        WHERE rim.recipe_id = r.id 
        AND rim.ingredient_name = ri.ingredient_name
    );

-- Final verification: Show mapping status
SELECT 
    'INGREDIENT CORRECTION STATUS' as status,
    'Updated recipe ingredients and mappings for inventory deduction compatibility' as message,
    (SELECT COUNT(*) FROM recipe_ingredients WHERE ingredient_name IN ('Coffee Beans', 'Bending Straw', 'Vanilla Syrup', 'Chocolate Syrup', 'Milk', 'Choco Flakes', 'Oreo Cookie')) as updated_ingredients,
    (SELECT COUNT(*) FROM recipe_ingredient_mappings WHERE ingredient_name IN ('Coffee Beans', 'Bending Straw', 'Vanilla Syrup', 'Chocolate Syrup', 'Milk', 'Choco Flakes', 'Oreo Cookie')) as active_mappings;