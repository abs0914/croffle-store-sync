-- PHASE 1: COMPREHENSIVE FIX FOR MINI CROFFLE AND CROFFLE OVERLOAD INVENTORY DEDUCTION ISSUES
-- This migration addresses NULL recipe_id products, incorrect quantities, and missed deductions

-- 1.1: Fix Mini Croffle Template Quantities (Change from 1.0 to 0.5 for core ingredients)
UPDATE recipe_template_ingredients 
SET quantity = 0.5
WHERE recipe_template_id = 'b3dc14e1-16d4-4cdc-a30b-cf9c9a9975d5'
    AND ingredient_name IN ('REGULAR CROISSANT', 'Whipped Cream');

-- 1.2: Update All Mini Croffle Recipes with Correct Quantities
UPDATE recipe_ingredients ri
SET 
    quantity = 0.5,
    updated_at = NOW()
FROM recipes r
WHERE ri.recipe_id = r.id
    AND r.template_id = 'b3dc14e1-16d4-4cdc-a30b-cf9c9a9975d5'
    AND ri.ingredient_name IN ('REGULAR CROISSANT', 'Whipped Cream');

-- 1.3: Link Orphaned Mini Croffle Products to Their Recipes
UPDATE product_catalog pc
SET 
    recipe_id = r.id,
    updated_at = NOW()
FROM recipes r
WHERE pc.recipe_id IS NULL
    AND LOWER(TRIM(pc.product_name)) = 'mini croffle'
    AND r.store_id = pc.store_id
    AND r.template_id = 'b3dc14e1-16d4-4cdc-a30b-cf9c9a9975d5'
    AND r.is_active = true;

-- 1.4: Link Orphaned Croffle Overload Products to Their Recipes  
UPDATE product_catalog pc
SET 
    recipe_id = r.id,
    updated_at = NOW()
FROM recipes r
WHERE pc.recipe_id IS NULL
    AND LOWER(TRIM(pc.product_name)) = 'croffle overload'
    AND r.store_id = pc.store_id
    AND r.template_id = '2ca284ee-1dab-4ff3-bcb7-fb21278e2cc3'
    AND r.is_active = true;

-- 1.5: Execute Missed Deduction for Mini Croffle Transaction (20250910-5721-152838)
-- Get current inventory quantities before deduction
WITH current_inventory AS (
    SELECT id, item, stock_quantity
    FROM inventory_stock
    WHERE store_id = '5721eaa4-4a8e-4b56-b401-7e7b0e0b6b57'
        AND item IN ('REGULAR CROISSANT', 'Whipped Cream')
        AND is_active = true
)
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
    ci.id,
    'sale',
    -0.5,
    ci.stock_quantity,
    ci.stock_quantity - 0.5,
    'transaction',
    'b93c0680-2232-4ffd-a474-54819dc5af12',
    'Retroactive deduction for Mini Croffle transaction 20250910-5721-152838 - ingredient: ' || ci.item,
    NOW()
FROM current_inventory ci;

-- Deduct 0.5 from both ingredients at Sugbo Mercado
UPDATE inventory_stock
SET 
    stock_quantity = stock_quantity - 0.5,
    updated_at = NOW()
WHERE store_id = '5721eaa4-4a8e-4b56-b401-7e7b0e0b6b57'
    AND item IN ('REGULAR CROISSANT', 'Whipped Cream')
    AND is_active = true;

-- 1.6: Execute Missed Deduction for Croffle Overload Transaction (20250910-5808-152955)
-- Get current inventory quantities before deduction  
WITH current_inventory_overload AS (
    SELECT id, item, stock_quantity
    FROM inventory_stock
    WHERE store_id = '5721eaa4-4a8e-4b56-b401-7e7b0e0b6b57'
        AND item IN ('REGULAR CROISSANT', 'Whipped Cream')
        AND is_active = true
)
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
    ci.id,
    'sale',
    -1.0,
    ci.stock_quantity,
    ci.stock_quantity - 1.0,
    'transaction',
    '2ca284ee-1dab-4ff3-bcb7-fb21278e2cc3',
    'Retroactive deduction for Croffle Overload transaction 20250910-5808-152955 - ingredient: ' || ci.item,
    NOW()
FROM current_inventory_overload ci;

-- Deduct 1.0 from both ingredients at Sugbo Mercado
UPDATE inventory_stock
SET 
    stock_quantity = stock_quantity - 1.0,
    updated_at = NOW()
WHERE store_id = '5721eaa4-4a8e-4b56-b401-7e7b0e0b6b57'
    AND item IN ('REGULAR CROISSANT', 'Whipped Cream')
    AND is_active = true;

-- 1.7: Create Inventory Sync Audit Records for Manual Corrections
INSERT INTO inventory_sync_audit (
    transaction_id,
    sync_status,
    error_details,
    items_processed,
    affected_inventory_items,
    created_at
) VALUES 
(
    'b93c0680-2232-4ffd-a474-54819dc5af12',
    'success',
    'Retroactive deduction processed for Mini Croffle - was NULL recipe_id',
    2,
    jsonb_build_array(
        jsonb_build_object('item', 'REGULAR CROISSANT', 'deducted', 0.5),
        jsonb_build_object('item', 'Whipped Cream', 'deducted', 0.5)
    ),
    NOW()
),
(
    '2ca284ee-1dab-4ff3-bcb7-fb21278e2cc3',
    'success', 
    'Retroactive deduction processed for Croffle Overload - was NULL recipe_id',
    2,
    jsonb_build_array(
        jsonb_build_object('item', 'REGULAR CROISSANT', 'deducted', 1.0),
        jsonb_build_object('item', 'Whipped Cream', 'deducted', 1.0)
    ),
    NOW()
);