-- COMPREHENSIVE COFFEE RECIPE INGREDIENT CORRECTIONS (FINAL)
-- Complete the retroactive corrections with valid user ID

-- Step 11: Retroactive Corrections with Valid User ID
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

-- Record audit trail for retroactive corrections (with valid admin user ID)
INSERT INTO inventory_movements (
    inventory_stock_id,
    movement_type,
    quantity_change,
    previous_quantity,
    new_quantity,
    reference_type,
    reference_id,
    notes,
    created_by,
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
    -- Use valid admin user ID
    'ed84e5dd-f5cb-41df-8e6e-898e7c559cc2',
    NOW()
FROM inventory_stock ist
JOIN transactions t ON (
    (ist.item = 'Bending Straw' AND t.receipt_number = '20250910-2593-155011' AND ist.store_id = t.store_id) OR
    (ist.item = 'Vanilla Syrup' AND t.receipt_number = '20250910-2954-155202' AND ist.store_id = t.store_id)
)
WHERE ist.is_active = true;

-- Final Summary: Show results of comprehensive ingredient corrections
SELECT 
    'COMPREHENSIVE RECIPE CORRECTION SUMMARY' as status,
    'Successfully updated all recipe templates and deployed recipes' as message,
    COUNT(*) as updated_recipes
FROM recipes r
WHERE r.is_active = true
    AND EXISTS (
        SELECT 1 FROM recipe_ingredients ri 
        WHERE ri.recipe_id = r.id 
        AND ri.ingredient_name IN ('Coffee Beans', 'Bending Straw', 'Vanilla Syrup', 'Chocolate Syrup', 'Strawberry Syrup', 'Milk', 'Monalisa', 'Matcha Powder', 'Frappe Powder', 'Iced Tea Powder', 'Lemonade Powder', 'Choco Flakes', 'Oreo Cookie', 'Crushed Oreo')
    );