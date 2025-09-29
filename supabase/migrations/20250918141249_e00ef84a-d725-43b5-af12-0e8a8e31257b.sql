-- Delete test transactions for Sugbo Mercado (IT Park, Cebu) from Sept 15-18, 2025

-- Step 1: Delete transaction items first (to avoid foreign key constraints)
DELETE FROM transaction_items 
WHERE transaction_id IN (
  SELECT id FROM transactions 
  WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
    AND created_at >= '2025-09-15' 
    AND created_at < '2025-09-19'
);

-- Step 2: Delete any BIR audit logs related to these transactions
DELETE FROM bir_audit_logs 
WHERE transaction_id IN (
  SELECT id FROM transactions 
  WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
    AND created_at >= '2025-09-15' 
    AND created_at < '2025-09-19'
);

-- Step 3: Delete any inventory transactions related to these sales
DELETE FROM inventory_transactions 
WHERE transaction_id IN (
  SELECT id FROM transactions 
  WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
    AND created_at >= '2025-09-15' 
    AND created_at < '2025-09-19'
);

-- Step 4: Delete any void transactions that might reference these transactions
DELETE FROM void_transactions 
WHERE original_transaction_id IN (
  SELECT id FROM transactions 
  WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
    AND created_at >= '2025-09-15' 
    AND created_at < '2025-09-19'
);

-- Step 5: Finally delete the main transactions
DELETE FROM transactions 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
  AND created_at >= '2025-09-15' 
  AND created_at < '2025-09-19';

-- Report the deletion results
SELECT 
  'Test transactions deleted for Sugbo Mercado (IT Park, Cebu) from Sept 15-18, 2025' AS status;