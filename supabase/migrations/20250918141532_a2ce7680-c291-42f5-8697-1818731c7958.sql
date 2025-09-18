-- Clear all remaining dashboard data for Sugbo Mercado (IT Park, Cebu)

-- Step 1: Delete all transaction items first
DELETE FROM transaction_items 
WHERE transaction_id IN (
  SELECT id FROM transactions 
  WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
);

-- Step 2: Delete any BIR audit logs
DELETE FROM bir_audit_logs 
WHERE transaction_id IN (
  SELECT id FROM transactions 
  WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
);

-- Step 3: Delete any inventory transactions
DELETE FROM inventory_transactions 
WHERE transaction_id IN (
  SELECT id FROM transactions 
  WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
);

-- Step 4: Delete any void transactions
DELETE FROM void_transactions 
WHERE original_transaction_id IN (
  SELECT id FROM transactions 
  WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
);

-- Step 5: Delete any BIR daily summary data
DELETE FROM bir_daily_summary 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Step 6: Reset BIR cumulative sales
DELETE FROM bir_cumulative_sales 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Step 7: Delete all remaining transactions
DELETE FROM transactions 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Confirmation query
SELECT 
  'Dashboard data completely cleared for Sugbo Mercado (IT Park, Cebu)' AS status,
  COUNT(*) as remaining_transactions
FROM transactions 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';