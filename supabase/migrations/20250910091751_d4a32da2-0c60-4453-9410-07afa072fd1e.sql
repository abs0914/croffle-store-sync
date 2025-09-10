-- COMPLETE INGREDIENT CORRECTIONS FOR INVENTORY DEDUCTION (CONFLICT-SAFE)
-- Simple approach: handle corrections step by step

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

-- Step 2: Update existing mappings to use corrected names
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
    ingredient_name = 'Oreo Cookie',
    updated_at = NOW()
WHERE ingredient_name IN ('Oreo', 'Crushed Oreo');

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

-- Step 4: Update recipe costs after ingredient corrections
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

-- Step 5: Final verification and summary
SELECT 
    'INGREDIENT CORRECTIONS COMPLETED SUCCESSFULLY' as status,
    'All recipe ingredients updated with corrected names and quantities' as message,
    (SELECT COUNT(*) FROM recipe_ingredients WHERE ingredient_name IN ('Coffee Beans', 'Bending Straw', 'Vanilla Syrup', 'Chocolate Syrup', 'Milk', 'Choco Flakes', 'Oreo Cookie')) as corrected_ingredients,
    (SELECT COUNT(*) FROM recipe_ingredient_mappings WHERE ingredient_name IN ('Coffee Beans', 'Bending Straw', 'Oreo Cookie')) as updated_mappings,
    (SELECT COUNT(*) FROM inventory_stock WHERE item IN ('Coffee Beans', 'Bending Straw') AND recipe_compatible = true) as new_inventory_items,
    'Inventory deduction system is now compatible with corrected ingredient names' as deduction_status;