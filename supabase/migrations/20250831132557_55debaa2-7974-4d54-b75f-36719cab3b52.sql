-- Fix inventory deduction system by removing problematic trigger and cleaning orphaned records

-- 1. Drop the problematic auto deduction trigger
DROP TRIGGER IF EXISTS auto_deduct_inventory_trigger ON transactions;

-- 2. Drop the trigger function since it's causing issues
DROP FUNCTION IF EXISTS auto_deduct_inventory_on_transaction();

-- 3. Clean up orphaned inventory_transactions records with non-existent product_id references
-- First, let's see what we're dealing with
DELETE FROM inventory_transactions 
WHERE product_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 FROM products p WHERE p.id = inventory_transactions.product_id
);

-- 4. Clean up any inventory_transactions that might have been created by the broken trigger
-- These would have transaction_type = 'sale' and reference_id pointing to transactions
DELETE FROM inventory_transactions 
WHERE transaction_type = 'sale' 
AND reference_id IS NOT NULL
AND EXISTS (
    SELECT 1 FROM transactions t WHERE t.id::text = inventory_transactions.reference_id
)
AND product_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 FROM products p WHERE p.id = inventory_transactions.product_id
);

-- 5. Add a comment to document this fix
COMMENT ON TABLE inventory_transactions IS 'Product-level inventory transactions. Ingredient deductions are handled by the application-level inventoryDeductionService.ts';