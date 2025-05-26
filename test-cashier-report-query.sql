-- Test Cashier Report Query - Exact Replica of Frontend Logic
-- Run this to see what the cashier report should return

-- Set the parameters (adjust dates as needed)
-- Store ID: fd45e07e-7832-4f51-b46b-7ef604359b86 (from console logs)
-- Date: Current date (May 26th, 2025)

-- 1. Test the exact transaction query used by the frontend
SELECT
    'FRONTEND TRANSACTION QUERY' as test_name,
    t.*
FROM transactions t
WHERE t.store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86'
  AND t.status = 'completed'
  AND t.created_at >= (CURRENT_DATE::text || 'T00:00:00')::timestamptz
  AND t.created_at <= (CURRENT_DATE::text || 'T23:59:59')::timestamptz
ORDER BY t.created_at DESC;

-- 2. Test the exact shifts query used by the frontend
SELECT
    'FRONTEND SHIFTS QUERY' as test_name,
    s.*
FROM shifts s
WHERE s.store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86'
  AND s.start_time >= (CURRENT_DATE::text || 'T00:00:00')::timestamptz
  AND s.start_time <= (CURRENT_DATE::text || 'T23:59:59')::timestamptz
ORDER BY s.start_time DESC;

-- 3. Test the app_users query for cashier role
SELECT
    'APP_USERS CASHIER QUERY' as test_name,
    au.user_id,
    au.first_name,
    au.last_name,
    au.store_ids,
    au.role,
    au.is_active
FROM app_users au
WHERE au.role = 'cashier'
  AND au.is_active = true
  AND 'fd45e07e-7832-4f51-b46b-7ef604359b86' = ANY(au.store_ids);

-- 4. Test the combined query that the report processor would create
SELECT
    'COMBINED CASHIER REPORT DATA' as test_name,
    t.user_id,
    COUNT(t.id) as transaction_count,
    SUM(t.total) as total_sales,
    AVG(t.total) as avg_transaction_value,
    au.first_name || ' ' || au.last_name as cashier_name,
    au.email as cashier_email
FROM transactions t
LEFT JOIN app_users au ON t.user_id = au.user_id
WHERE t.store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86'
  AND t.status = 'completed'
  AND t.created_at >= (CURRENT_DATE::text || 'T00:00:00')::timestamptz
  AND t.created_at <= (CURRENT_DATE::text || 'T23:59:59')::timestamptz
GROUP BY t.user_id, au.first_name, au.last_name, au.email
ORDER BY total_sales DESC;

-- 5. Test with different date formats (in case of timezone issues)
SELECT
    'TIMEZONE TEST' as test_name,
    t.user_id,
    t.created_at,
    t.created_at::date as created_date,
    CURRENT_DATE as current_date,
    (t.created_at::date = CURRENT_DATE) as is_today
FROM transactions t
WHERE t.store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86'
  AND t.status = 'completed'
ORDER BY t.created_at DESC
LIMIT 5;

-- 6. Check if there are any transactions at all for this store
SELECT
    'ALL STORE TRANSACTIONS' as test_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
    MIN(created_at) as earliest,
    MAX(created_at) as latest,
    COUNT(DISTINCT user_id) as unique_users
FROM transactions
WHERE store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

-- 7. Debug the exact date range the frontend is using
SELECT
    'DATE RANGE DEBUG' as test_name,
    CURRENT_DATE as current_date,
    CURRENT_DATE::text || 'T00:00:00' as start_range,
    CURRENT_DATE::text || 'T23:59:59' as end_range,
    NOW() as current_timestamp,
    NOW()::date as current_date_from_now;
