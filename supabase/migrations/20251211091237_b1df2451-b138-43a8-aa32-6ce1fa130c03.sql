-- Delete Transaction 20251211-9959-170710 and restore inventory

-- Step 1: Restore inventory stock levels (reverse deductions)
UPDATE inventory_stock
SET 
  stock_quantity = im.previous_quantity,
  serving_ready_quantity = im.previous_quantity,
  updated_at = NOW()
FROM inventory_movements im
WHERE inventory_stock.id = im.inventory_stock_id
  AND im.reference_id = 'b33795ad-fb42-431e-a87d-e3ddb75aeeff'
  AND im.movement_type = 'sale';

-- Step 2: Delete inventory movements
DELETE FROM inventory_movements 
WHERE reference_id = 'b33795ad-fb42-431e-a87d-e3ddb75aeeff';

-- Step 3: Delete transaction items
DELETE FROM transaction_items 
WHERE transaction_id = 'b33795ad-fb42-431e-a87d-e3ddb75aeeff';

-- Step 4: Delete the transaction
DELETE FROM transactions 
WHERE id = 'b33795ad-fb42-431e-a87d-e3ddb75aeeff';