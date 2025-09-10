-- COMPREHENSIVE COFFEE RECIPE INGREDIENT CORRECTIONS (FIXED ENUM VALUES)
-- Implements the complete plan for ingredient updates, unit conversions, and retroactive corrections

-- Step 1: Coffee Beans Conversion (10 recipes)
-- Convert "Espresso Shot (1 piece)" to "Coffee Beans (grams)"

-- Americano recipes get 12g Coffee Beans
UPDATE recipe_template_ingredients 
SET 
    ingredient_name = 'Coffee Beans',
    quantity = 12,
    unit = 'g'
WHERE recipe_template_id IN (
    SELECT id FROM recipe_templates 
    WHERE name IN ('Americano Hot', 'Americano Iced')
    AND is_active = true
) AND ingredient_name = 'Espresso Shot';

-- All other espresso recipes get 10g Coffee Beans
UPDATE recipe_template_ingredients 
SET 
    ingredient_name = 'Coffee Beans',
    quantity = 10,
    unit = 'g'
WHERE recipe_template_id IN (
    SELECT id FROM recipe_templates 
    WHERE name IN ('Cafe Latte Hot', 'Cafe Latte Iced', 'Cappuccino Hot', 'Cappuccino Iced', 
                   'Cafe Mocha Hot', 'Cafe Mocha Iced', 'Caramel Latte Hot', 'Caramel Latte Iced')
    AND is_active = true
) AND ingredient_name = 'Espresso Shot';

-- Step 2: Add Missing Bending Straws (5 recipes)
-- Add "Bending Straw (1 piece)" to iced coffee recipes missing them

INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT 
    rt.id,
    'Bending Straw',
    1,
    'pieces',
    1.00
FROM recipe_templates rt
WHERE rt.name IN ('Americano Iced', 'Cafe Latte Iced', 'Cappuccino Iced', 'Cafe Mocha Iced', 'Caramel Latte Iced')
    AND rt.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM recipe_template_ingredients rti
        WHERE rti.recipe_template_id = rt.id 
        AND rti.ingredient_name = 'Bending Straw'
    );

-- Step 3: Syrup Quantity Updates
-- Update Vanilla Syrup quantities
UPDATE recipe_template_ingredients 
SET 
    quantity = CASE 
        WHEN recipe_template_id IN (
            SELECT id FROM recipe_templates 
            WHERE name IN ('Caramel Latte Hot', 'Caramel Latte Iced', 'Strawberry Latte')
        ) THEN 5
        WHEN recipe_template_id IN (
            SELECT id FROM recipe_templates 
            WHERE name = 'Vanilla Caramel'
        ) THEN 10
        ELSE quantity
    END,
    unit = 'ml'
WHERE ingredient_name = 'Vanilla Syrup'
    AND recipe_template_id IN (
        SELECT id FROM recipe_templates 
        WHERE name IN ('Caramel Latte Hot', 'Caramel Latte Iced', 'Vanilla Caramel', 'Strawberry Latte')
        AND is_active = true
    );

-- Update Chocolate Syrup quantities (30ml for Cafe Mochas)
UPDATE recipe_template_ingredients 
SET 
    quantity = 30,
    unit = 'ml'
WHERE ingredient_name = 'Chocolate Syrup'
    AND recipe_template_id IN (
        SELECT id FROM recipe_templates 
        WHERE name IN ('Cafe Mocha Hot', 'Cafe Mocha Iced')
        AND is_active = true
    );

-- Update Strawberry Syrup quantities
UPDATE recipe_template_ingredients 
SET 
    quantity = CASE 
        WHEN recipe_template_id IN (
            SELECT id FROM recipe_templates 
            WHERE name = 'Strawberry Latte'
        ) THEN 20
        WHEN recipe_template_id IN (
            SELECT id FROM recipe_templates 
            WHERE name IN ('Strawberry Kiss Blended', 'Oreo Strawberry Blended')
        ) THEN 30
        ELSE quantity
    END,
    unit = 'ml'
WHERE ingredient_name = 'Strawberry Syrup'
    AND recipe_template_id IN (
        SELECT id FROM recipe_templates 
        WHERE name IN ('Strawberry Latte', 'Strawberry Kiss Blended', 'Oreo Strawberry Blended')
        AND is_active = true
    );

-- Step 4: Milk Quantity Updates (150ml for 13 recipes)
UPDATE recipe_template_ingredients 
SET 
    quantity = 150,
    unit = 'ml'
WHERE ingredient_name = 'Milk'
    AND recipe_template_id IN (
        SELECT id FROM recipe_templates 
        WHERE name IN ('Cafe Mocha Hot', 'Cafe Mocha Iced', 'Cappuccino Hot', 'Cappuccino Iced',
                       'Cafe Latte Hot', 'Cafe Latte Iced', 'Caramel Latte Hot', 'Caramel Latte Iced',
                       'Vanilla Caramel', 'Matcha Blended', 'Strawberry Latte', 'Strawberry Kiss Blended',
                       'Oreo Strawberry Blended')
        AND is_active = true
    );

-- Step 5: Special Ingredient Updates
-- Update Monalisa (5ml for Vanilla Caramel)
UPDATE recipe_template_ingredients 
SET 
    quantity = 5,
    unit = 'ml'
WHERE ingredient_name = 'Monalisa'
    AND recipe_template_id IN (
        SELECT id FROM recipe_templates 
        WHERE name = 'Vanilla Caramel'
        AND is_active = true
    );

-- Update Matcha Powder (30g for Matcha Blended)
UPDATE recipe_template_ingredients 
SET 
    quantity = 30,
    unit = 'g'
WHERE ingredient_name = 'Matcha Powder'
    AND recipe_template_id IN (
        SELECT id FROM recipe_templates 
        WHERE name = 'Matcha Blended'
        AND is_active = true
    );

-- Step 6: Frappe Powder Updates (3 recipes)
UPDATE recipe_template_ingredients 
SET 
    quantity = CASE 
        WHEN recipe_template_id IN (
            SELECT id FROM recipe_templates 
            WHERE name = 'Matcha Blended'
        ) THEN 20
        WHEN recipe_template_id IN (
            SELECT id FROM recipe_templates 
            WHERE name IN ('Strawberry Kiss Blended', 'Oreo Strawberry Blended')
        ) THEN 30
        ELSE quantity
    END,
    unit = 'g'
WHERE ingredient_name = 'Frappe Powder'
    AND recipe_template_id IN (
        SELECT id FROM recipe_templates 
        WHERE name IN ('Matcha Blended', 'Strawberry Kiss Blended', 'Oreo Strawberry Blended')
        AND is_active = true
    );

-- Step 7: Tea and Lemonade Powder Updates (2 recipes)
UPDATE recipe_template_ingredients 
SET 
    quantity = 10,
    unit = 'g'
WHERE ingredient_name = 'Iced Tea Powder'
    AND recipe_template_id IN (
        SELECT id FROM recipe_templates 
        WHERE name = 'Iced Tea'
        AND is_active = true
    );

UPDATE recipe_template_ingredients 
SET 
    quantity = 10,
    unit = 'g'
WHERE ingredient_name = 'Lemonade Powder'
    AND recipe_template_id IN (
        SELECT id FROM recipe_templates 
        WHERE name = 'Lemonade'
        AND is_active = true
    );

-- Step 8: Choco Flakes Unit Change (4 recipes)
-- Update existing Choco Flakes to pieces (closest valid unit for portions)
UPDATE recipe_template_ingredients 
SET 
    quantity = CASE 
        WHEN recipe_template_id IN (
            SELECT id FROM recipe_templates 
            WHERE name = 'Strawberry Kiss Blended'
        ) THEN 2
        WHEN recipe_template_id IN (
            SELECT id FROM recipe_templates 
            WHERE name = 'Tiramisu Croffle'
        ) THEN 1
        ELSE quantity
    END,
    unit = 'pieces'
WHERE ingredient_name = 'Choco Flakes'
    AND recipe_template_id IN (
        SELECT id FROM recipe_templates 
        WHERE name IN ('Strawberry Kiss Blended', 'Tiramisu Croffle')
        AND is_active = true
    );

-- Add missing Choco Flakes to Croffle Overload and Mini Croffle
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT 
    rt.id,
    'Choco Flakes',
    1,
    'pieces',
    5.00
FROM recipe_templates rt
WHERE rt.name IN ('Croffle Overload', 'Mini Croffle')
    AND rt.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM recipe_template_ingredients rti
        WHERE rti.recipe_template_id = rt.id 
        AND rti.ingredient_name = 'Choco Flakes'
    );

-- Step 9: Oreo Ingredient Updates (1 recipe)
-- Update Oreo Cookie unit from piece to pieces (valid enum value)
UPDATE recipe_template_ingredients 
SET 
    unit = 'pieces'
WHERE ingredient_name = 'Oreo Cookie'
    AND recipe_template_id IN (
        SELECT id FROM recipe_templates 
        WHERE name = 'Oreo Strawberry Blended'
        AND is_active = true
    );

-- Update Crushed Oreo to 3 pieces (closest valid unit for portions)
UPDATE recipe_template_ingredients 
SET 
    quantity = 3,
    unit = 'pieces'
WHERE ingredient_name = 'Crushed Oreo'
    AND recipe_template_id IN (
        SELECT id FROM recipe_templates 
        WHERE name = 'Oreo Strawberry Blended'
        AND is_active = true
    );

-- Step 10: Deploy All Changes to Store Recipes
-- Update Coffee Beans in deployed recipes
UPDATE recipe_ingredients ri
SET 
    ingredient_name = 'Coffee Beans',
    quantity = CASE 
        WHEN r.name IN ('Americano Hot', 'Americano Iced') THEN 12
        ELSE 10
    END,
    unit = 'g',
    updated_at = NOW()
FROM recipes r
WHERE ri.recipe_id = r.id
    AND r.is_active = true
    AND ri.ingredient_name = 'Espresso Shot'
    AND r.name IN ('Americano Hot', 'Americano Iced', 'Cafe Latte Hot', 'Cafe Latte Iced', 
                   'Cappuccino Hot', 'Cappuccino Iced', 'Cafe Mocha Hot', 'Cafe Mocha Iced',
                   'Caramel Latte Hot', 'Caramel Latte Iced');

-- Add missing Bending Straws to deployed recipes
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, created_at, updated_at)
SELECT 
    r.id,
    'Bending Straw',
    1,
    'pieces',
    1.00,
    NOW(),
    NOW()
FROM recipes r
WHERE r.name IN ('Americano Iced', 'Cafe Latte Iced', 'Cappuccino Iced', 'Cafe Mocha Iced', 'Caramel Latte Iced')
    AND r.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM recipe_ingredients ri
        WHERE ri.recipe_id = r.id 
        AND ri.ingredient_name = 'Bending Straw'
    );

-- Update all syrup quantities in deployed recipes
UPDATE recipe_ingredients ri
SET 
    quantity = CASE 
        WHEN ri.ingredient_name = 'Vanilla Syrup' AND r.name IN ('Caramel Latte Hot', 'Caramel Latte Iced', 'Strawberry Latte') THEN 5
        WHEN ri.ingredient_name = 'Vanilla Syrup' AND r.name = 'Vanilla Caramel' THEN 10
        WHEN ri.ingredient_name = 'Chocolate Syrup' AND r.name IN ('Cafe Mocha Hot', 'Cafe Mocha Iced') THEN 30
        WHEN ri.ingredient_name = 'Strawberry Syrup' AND r.name = 'Strawberry Latte' THEN 20
        WHEN ri.ingredient_name = 'Strawberry Syrup' AND r.name IN ('Strawberry Kiss Blended', 'Oreo Strawberry Blended') THEN 30
        ELSE ri.quantity
    END,
    unit = CASE 
        WHEN ri.ingredient_name IN ('Vanilla Syrup', 'Chocolate Syrup', 'Strawberry Syrup') THEN 'ml'
        ELSE ri.unit
    END,
    updated_at = NOW()
FROM recipes r
WHERE ri.recipe_id = r.id
    AND r.is_active = true
    AND ri.ingredient_name IN ('Vanilla Syrup', 'Chocolate Syrup', 'Strawberry Syrup');

-- Update Milk quantities to 150ml in deployed recipes
UPDATE recipe_ingredients ri
SET 
    quantity = 150,
    unit = 'ml',
    updated_at = NOW()
FROM recipes r
WHERE ri.recipe_id = r.id
    AND r.is_active = true
    AND ri.ingredient_name = 'Milk'
    AND r.name IN ('Cafe Mocha Hot', 'Cafe Mocha Iced', 'Cappuccino Hot', 'Cappuccino Iced',
                   'Cafe Latte Hot', 'Cafe Latte Iced', 'Caramel Latte Hot', 'Caramel Latte Iced',
                   'Vanilla Caramel', 'Matcha Blended', 'Strawberry Latte', 'Strawberry Kiss Blended',
                   'Oreo Strawberry Blended');

-- Update special ingredients in deployed recipes
UPDATE recipe_ingredients ri
SET 
    quantity = CASE 
        WHEN ri.ingredient_name = 'Monalisa' THEN 5
        WHEN ri.ingredient_name = 'Matcha Powder' THEN 30
        ELSE ri.quantity
    END,
    unit = CASE 
        WHEN ri.ingredient_name = 'Monalisa' THEN 'ml'
        WHEN ri.ingredient_name = 'Matcha Powder' THEN 'g'
        ELSE ri.unit
    END,
    updated_at = NOW()
FROM recipes r
WHERE ri.recipe_id = r.id
    AND r.is_active = true
    AND ri.ingredient_name IN ('Monalisa', 'Matcha Powder');

-- Update powder ingredients in deployed recipes
UPDATE recipe_ingredients ri
SET 
    quantity = CASE 
        WHEN ri.ingredient_name = 'Frappe Powder' AND r.name = 'Matcha Blended' THEN 20
        WHEN ri.ingredient_name = 'Frappe Powder' AND r.name IN ('Strawberry Kiss Blended', 'Oreo Strawberry Blended') THEN 30
        WHEN ri.ingredient_name IN ('Iced Tea Powder', 'Lemonade Powder') THEN 10
        ELSE ri.quantity
    END,
    unit = 'g',
    updated_at = NOW()
FROM recipes r
WHERE ri.recipe_id = r.id
    AND r.is_active = true
    AND ri.ingredient_name IN ('Frappe Powder', 'Iced Tea Powder', 'Lemonade Powder');

-- Update Choco Flakes in deployed recipes (using pieces instead of portions)
UPDATE recipe_ingredients ri
SET 
    quantity = CASE 
        WHEN r.name = 'Strawberry Kiss Blended' THEN 2
        ELSE 1
    END,
    unit = 'pieces',
    updated_at = NOW()
FROM recipes r
WHERE ri.recipe_id = r.id
    AND r.is_active = true
    AND ri.ingredient_name = 'Choco Flakes';

-- Add missing Choco Flakes to deployed Croffle recipes
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, created_at, updated_at)
SELECT 
    r.id,
    'Choco Flakes',
    1,
    'pieces',
    5.00,
    NOW(),
    NOW()
FROM recipes r
WHERE r.name IN ('Croffle Overload', 'Mini Croffle')
    AND r.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM recipe_ingredients ri
        WHERE ri.recipe_id = r.id 
        AND ri.ingredient_name = 'Choco Flakes'
    );

-- Update Oreo ingredients in deployed recipes (using pieces instead of pc/portions)
UPDATE recipe_ingredients ri
SET 
    quantity = CASE 
        WHEN ri.ingredient_name = 'Crushed Oreo' THEN 3
        ELSE ri.quantity
    END,
    unit = 'pieces',
    updated_at = NOW()
FROM recipes r
WHERE ri.recipe_id = r.id
    AND r.is_active = true
    AND ri.ingredient_name IN ('Oreo Cookie', 'Crushed Oreo')
    AND r.name = 'Oreo Strawberry Blended';

-- Step 11: Retroactive Corrections
-- Create corrective inventory movements for Receipt 20250910-2593-155011 (Americano Iced): deduct missing Bending Straw
UPDATE inventory_stock
SET 
    stock_quantity = stock_quantity - 1,
    updated_at = NOW()
WHERE store_id IN (
    SELECT store_id FROM transactions 
    WHERE receipt_number = '20250910-2593-155011'
    LIMIT 1
) AND item = 'Bending Straw' AND is_active = true;

-- Create corrective inventory movements for Receipt 20250910-2954-155202 (Caramel Latte Hot): deduct missing Vanilla Syrup (5ml)
UPDATE inventory_stock
SET 
    stock_quantity = stock_quantity - 5,
    updated_at = NOW()
WHERE store_id IN (
    SELECT store_id FROM transactions 
    WHERE receipt_number = '20250910-2954-155202'
    LIMIT 1
) AND item = 'Vanilla Syrup' AND is_active = true;

-- Record audit trail for retroactive corrections
INSERT INTO inventory_movements (
    inventory_stock_id,
    movement_type,
    quantity_change,
    previous_quantity,
    new_quantity,
    reference_type,
    reference_id,
    notes,
    created_at
) 
SELECT 
    ist.id,
    'adjustment',
    CASE 
        WHEN ist.item = 'Bending Straw' THEN -1
        WHEN ist.item = 'Vanilla Syrup' THEN -5
    END,
    ist.stock_quantity + CASE 
        WHEN ist.item = 'Bending Straw' THEN 1
        WHEN ist.item = 'Vanilla Syrup' THEN 5
    END,
    ist.stock_quantity,
    'correction',
    CASE 
        WHEN ist.item = 'Bending Straw' THEN (SELECT id FROM transactions WHERE receipt_number = '20250910-2593-155011' LIMIT 1)
        WHEN ist.item = 'Vanilla Syrup' THEN (SELECT id FROM transactions WHERE receipt_number = '20250910-2954-155202' LIMIT 1)
    END,
    CASE 
        WHEN ist.item = 'Bending Straw' THEN 'Retroactive deduction for missing Bending Straw in Americano Iced transaction 20250910-2593-155011'
        WHEN ist.item = 'Vanilla Syrup' THEN 'Retroactive deduction for missing Vanilla Syrup (5ml) in Caramel Latte Hot transaction 20250910-2954-155202'
    END,
    NOW()
FROM inventory_stock ist
JOIN transactions t ON (
    (ist.item = 'Bending Straw' AND t.receipt_number = '20250910-2593-155011' AND ist.store_id = t.store_id) OR
    (ist.item = 'Vanilla Syrup' AND t.receipt_number = '20250910-2954-155202' AND ist.store_id = t.store_id)
)
WHERE ist.is_active = true;

-- Step 12: Recalculate Recipe Costs
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

-- Final Verification: Check sample of updated ingredients
SELECT 
    'Template Updates Check' as verification_type,
    rt.name as recipe_name,
    rti.ingredient_name,
    rti.quantity,
    rti.unit
FROM recipe_templates rt
JOIN recipe_template_ingredients rti ON rt.id = rti.recipe_template_id
WHERE rt.name IN ('Americano Hot', 'Cafe Mocha Hot', 'Strawberry Kiss Blended', 'Matcha Blended')
    AND rti.ingredient_name IN ('Coffee Beans', 'Chocolate Syrup', 'Frappe Powder', 'Choco Flakes')
ORDER BY rt.name, rti.ingredient_name;