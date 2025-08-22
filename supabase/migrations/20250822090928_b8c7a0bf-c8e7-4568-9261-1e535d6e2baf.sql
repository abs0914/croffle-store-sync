-- Fix the product_id mismatch in the transaction items
-- Update transaction items to point to the correct products with recipes

-- Update Tiramisu Croffle transaction item
UPDATE transaction_items 
SET product_id = 'ed113579-ea64-4a22-b7d1-7f295fd70614'  -- Correct Tiramisu Croffle product with recipe
WHERE product_id = '18e562e6-ef79-4eec-aaad-508cc8da2d1d'
  AND transaction_id IN (
    SELECT id FROM transactions 
    WHERE receipt_number = '20250822-0842-151217'
      AND store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  );

-- Update Choco Nut Croffle transaction item  
UPDATE transaction_items 
SET product_id = 'c226c1bb-a00b-494a-86f4-0b173cd1458d'  -- Correct Choco Nut Croffle product with recipe
WHERE product_id = 'b3b68be6-d59e-46be-aef0-5c429886ed8c'
  AND transaction_id IN (
    SELECT id FROM transactions 
    WHERE receipt_number = '20250822-8966-151346'
      AND store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  );