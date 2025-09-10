-- CROFFLE OVERLOAD RECIPE CORRECTION
-- Fix quantities: 0.5 Regular Croissant, 0 Whipped Cream

-- 1. Update Croffle Overload Template Ingredients
UPDATE recipe_template_ingredients 
SET quantity = 0.5
WHERE recipe_template_id = '2ca284ee-1dab-4ff3-bcb7-fb21278e2cc3'
    AND ingredient_name = 'REGULAR CROISSANT';

-- Set Whipped Cream to 0 for Croffle Overload (or remove if it exists)
UPDATE recipe_template_ingredients 
SET quantity = 0
WHERE recipe_template_id = '2ca284ee-1dab-4ff3-bcb7-fb21278e2cc3'
    AND ingredient_name = 'Whipped Cream';

-- If Whipped Cream doesn't exist in template, no need to add it (0 means not used)

-- 2. Update All Deployed Croffle Overload Recipes
UPDATE recipe_ingredients ri
SET 
    quantity = 0.5,
    updated_at = NOW()
FROM recipes r
WHERE ri.recipe_id = r.id
    AND r.template_id = '2ca284ee-1dab-4ff3-bcb7-fb21278e2cc3'
    AND ri.ingredient_name = 'REGULAR CROISSANT';

-- Set Whipped Cream to 0 for all Croffle Overload recipes
UPDATE recipe_ingredients ri
SET 
    quantity = 0,
    updated_at = NOW()
FROM recipes r
WHERE ri.recipe_id = r.id
    AND r.template_id = '2ca284ee-1dab-4ff3-bcb7-fb21278e2cc3'
    AND ri.ingredient_name = 'Whipped Cream';

-- 3. Correct the Previous Retroactive Deduction
-- We incorrectly deducted 1.0 Regular Croissant and 1.0 Whipped Cream
-- But should have deducted 0.5 Regular Croissant and 0 Whipped Cream

-- Add back the over-deducted amounts at Sugbo Mercado
-- Over-deducted Regular Croissant: 1.0 - 0.5 = 0.5 (add back 0.5)
-- Over-deducted Whipped Cream: 1.0 - 0 = 1.0 (add back 1.0)

UPDATE inventory_stock
SET 
    stock_quantity = stock_quantity + 0.5,
    updated_at = NOW()
WHERE store_id = '5721eaa4-4a8e-4b56-b401-7e7b0e0b6b57'
    AND item = 'REGULAR CROISSANT'
    AND is_active = true;

UPDATE inventory_stock
SET 
    stock_quantity = stock_quantity + 1.0,
    updated_at = NOW()
WHERE store_id = '5721eaa4-4a8e-4b56-b401-7e7b0e0b6b57'
    AND item = 'Whipped Cream'
    AND is_active = true;

-- Create corrective inventory movement records
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
) SELECT 
    ist.id,
    'adjustment',
    CASE 
        WHEN ist.item = 'REGULAR CROISSANT' THEN 0.5
        WHEN ist.item = 'Whipped Cream' THEN 1.0
        ELSE 0
    END,
    ist.stock_quantity - CASE 
        WHEN ist.item = 'REGULAR CROISSANT' THEN 0.5
        WHEN ist.item = 'Whipped Cream' THEN 1.0
        ELSE 0
    END,
    ist.stock_quantity,
    'correction',
    '2ca284ee-1dab-4ff3-bcb7-fb21278e2cc3',
    'Corrective adjustment for Croffle Overload transaction 20250910-5808-152955 - ' || 
    CASE 
        WHEN ist.item = 'REGULAR CROISSANT' THEN 'reduced deduction from 1.0 to 0.5'
        WHEN ist.item = 'Whipped Cream' THEN 'removed ingredient (was 1.0, now 0)'
        ELSE ''
    END,
    NOW()
FROM inventory_stock ist
WHERE ist.store_id = '5721eaa4-4a8e-4b56-b401-7e7b0e0b6b57'
    AND ist.item IN ('REGULAR CROISSANT', 'Whipped Cream')
    AND ist.is_active = true;

-- Update inventory sync audit record to reflect correction
UPDATE inventory_sync_audit 
SET 
    sync_status = 'success',
    error_details = 'CORRECTED: Retroactive deduction for Croffle Overload - recipe corrected to 0.5 Regular Croissant, 0 Whipped Cream',
    affected_inventory_items = jsonb_build_array(
        jsonb_build_object('item', 'REGULAR CROISSANT', 'deducted', 0.5, 'corrected', true),
        jsonb_build_object('item', 'Whipped Cream', 'deducted', 0, 'corrected', true)
    )
WHERE transaction_id = '2ca284ee-1dab-4ff3-bcb7-fb21278e2cc3';

-- Verification: Check corrected quantities
SELECT 
    'Croffle Overload Template Ingredients' as check_type,
    ingredient_name,
    quantity
FROM recipe_template_ingredients 
WHERE recipe_template_id = '2ca284ee-1dab-4ff3-bcb7-fb21278e2cc3'
    AND ingredient_name IN ('REGULAR CROISSANT', 'Whipped Cream')

UNION ALL

SELECT 
    'Current Inventory After Correction' as check_type,
    item as ingredient_name,
    stock_quantity as quantity
FROM inventory_stock 
WHERE store_id = '5721eaa4-4a8e-4b56-b401-7e7b0e0b6b57'
    AND item IN ('REGULAR CROISSANT', 'Whipped Cream')
    AND is_active = true;