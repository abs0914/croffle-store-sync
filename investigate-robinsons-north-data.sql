-- Investigation script for Robinsons North cashier data
-- Store ID: a12a8269-5cbc-4a78-bae0-d6f166e1446d

-- 1. Check if the store exists and get basic info
SELECT 'STORE INFO' as section, id, name, address, is_active 
FROM stores 
WHERE id = 'a12a8269-5cbc-4a78-bae0-d6f166e1446d';

-- 2. Find all app_users assigned to Robinsons North
SELECT 'APP_USERS FOR ROBINSONS NORTH' as section,
       user_id, 
       first_name, 
       last_name, 
       role, 
       is_active,
       store_ids,
       created_at
FROM app_users 
WHERE store_ids @> '["a12a8269-5cbc-4a78-bae0-d6f166e1446d"]'
   OR store_ids::text LIKE '%a12a8269-5cbc-4a78-bae0-d6f166e1446d%'
ORDER BY created_at DESC;

-- 3. Check for any cashier role users (regardless of store assignment)
SELECT 'ALL CASHIER USERS' as section,
       user_id,
       first_name,
       last_name,
       store_ids,
       is_active
FROM app_users 
WHERE role = 'cashier' 
  AND is_active = true
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check transactions for Robinsons North (last 30 days)
SELECT 'TRANSACTIONS FOR ROBINSONS NORTH (LAST 30 DAYS)' as section,
       COUNT(*) as total_transactions,
       COUNT(DISTINCT user_id) as unique_cashiers,
       SUM(total) as total_sales,
       MIN(created_at) as earliest_transaction,
       MAX(created_at) as latest_transaction
FROM transactions 
WHERE store_id = 'a12a8269-5cbc-4a78-bae0-d6f166e1446d'
  AND status = 'completed'
  AND created_at >= CURRENT_DATE - INTERVAL '30 days';

-- 5. Get sample transactions with user details
SELECT 'SAMPLE TRANSACTIONS WITH USER INFO' as section,
       t.id,
       t.user_id,
       t.total,
       t.status,
       t.created_at,
       u.first_name,
       u.last_name
FROM transactions t
LEFT JOIN app_users u ON t.user_id = u.user_id
WHERE t.store_id = 'a12a8269-5cbc-4a78-bae0-d6f166e1446d'
  AND t.status = 'completed'
  AND t.created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY t.created_at DESC
LIMIT 10;

-- 6. Check shifts for Robinsons North (last 30 days)
SELECT 'SHIFTS FOR ROBINSONS NORTH (LAST 30 DAYS)' as section,
       COUNT(*) as total_shifts,
       COUNT(DISTINCT user_id) as unique_cashiers,
       MIN(start_time) as earliest_shift,
       MAX(start_time) as latest_shift
FROM shifts 
WHERE store_id = 'a12a8269-5cbc-4a78-bae0-d6f166e1446d'
  AND start_time >= CURRENT_DATE - INTERVAL '30 days';

-- 7. Get sample shifts with user details
SELECT 'SAMPLE SHIFTS WITH USER INFO' as section,
       s.id,
       s.user_id,
       s.start_time,
       s.end_time,
       s.status,
       u.first_name,
       u.last_name
FROM shifts s
LEFT JOIN app_users u ON s.user_id = u.user_id
WHERE s.store_id = 'a12a8269-5cbc-4a78-bae0-d6f166e1446d'
  AND s.start_time >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY s.start_time DESC
LIMIT 10;

-- 8. Check for today's data specifically (May 26th, 2025)
SELECT 'TODAYS DATA (MAY 26, 2025)' as section,
       'transactions' as data_type,
       COUNT(*) as count
FROM transactions 
WHERE store_id = 'a12a8269-5cbc-4a78-bae0-d6f166e1446d'
  AND status = 'completed'
  AND DATE(created_at) = '2025-05-26'
UNION ALL
SELECT 'TODAYS DATA (MAY 26, 2025)' as section,
       'shifts' as data_type,
       COUNT(*) as count
FROM shifts 
WHERE store_id = 'a12a8269-5cbc-4a78-bae0-d6f166e1446d'
  AND DATE(start_time) = '2025-05-26';

-- 9. Check if test data was inserted
SELECT 'TEST DATA CHECK' as section,
       'test_users' as data_type,
       COUNT(*) as count
FROM app_users 
WHERE user_id LIKE 'test-user-%'
UNION ALL
SELECT 'TEST DATA CHECK' as section,
       'test_transactions' as data_type,
       COUNT(*) as count
FROM transactions 
WHERE id LIKE 'test-tx-%'
UNION ALL
SELECT 'TEST DATA CHECK' as section,
       'test_shifts' as data_type,
       COUNT(*) as count
FROM shifts 
WHERE id LIKE 'test-shift-%';

-- 10. Check for any transactions with user_ids that exist in app_users
SELECT 'TRANSACTIONS WITH VALID USER_IDS' as section,
       t.store_id,
       COUNT(*) as transaction_count,
       COUNT(DISTINCT t.user_id) as unique_users,
       COUNT(DISTINCT u.user_id) as users_found_in_app_users
FROM transactions t
LEFT JOIN app_users u ON t.user_id = u.user_id
WHERE t.store_id = 'a12a8269-5cbc-4a78-bae0-d6f166e1446d'
  AND t.status = 'completed'
  AND t.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY t.store_id;
