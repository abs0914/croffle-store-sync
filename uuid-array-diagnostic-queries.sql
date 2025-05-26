-- Diagnostic Queries for UUID Array columns
-- Run these in your database console

-- 1. Check if store exists
SELECT id, name FROM stores WHERE id = 'a12a8269-5cbc-4a78-bae0-d6f166e1446d';

-- 2. Check for any cashiers in the system
SELECT COUNT(*) as total_cashiers FROM app_users WHERE role = 'cashier' AND is_active = true;

-- 3. Check if test data was inserted
SELECT COUNT(*) as test_users FROM app_users WHERE user_id::text LIKE 'test-user-%';

-- 4. Check recent transactions for Robinsons North
SELECT COUNT(*) as recent_transactions 
FROM transactions 
WHERE store_id = 'a12a8269-5cbc-4a78-bae0-d6f166e1446d' 
  AND created_at >= CURRENT_DATE - INTERVAL '30 days';

-- 5. Check for cashiers assigned to Robinsons North (fixed for UUID array)
SELECT user_id, first_name, last_name, store_ids 
FROM app_users 
WHERE role = 'cashier' 
  AND is_active = true 
  AND 'a12a8269-5cbc-4a78-bae0-d6f166e1446d'::uuid = ANY(store_ids);

-- 6. Show sample of all cashiers (to see data structure)
SELECT user_id, first_name, last_name, role, store_ids 
FROM app_users 
WHERE role = 'cashier' 
  AND is_active = true 
LIMIT 5;

-- 7. Check what stores exist in the system
SELECT id, name, is_active FROM stores ORDER BY name LIMIT 10;

-- 8. Check all transactions for this store (any date)
SELECT COUNT(*) as all_transactions, 
       MIN(created_at) as earliest, 
       MAX(created_at) as latest
FROM transactions 
WHERE store_id = 'a12a8269-5cbc-4a78-bae0-d6f166e1446d';

-- 9. Check store_ids column type and sample data
SELECT store_ids, pg_typeof(store_ids) as column_type
FROM app_users 
WHERE role = 'cashier' 
  AND is_active = true 
  AND store_ids IS NOT NULL
LIMIT 3;
