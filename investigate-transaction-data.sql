-- Investigate Transaction Data for Robinsons North Cashier
-- Run these queries to understand why the transaction isn't showing in the report

-- 1. Check if the transaction was actually saved
SELECT 
    'RECENT TRANSACTIONS' as section,
    t.id,
    t.user_id,
    t.store_id,
    t.total,
    t.status,
    t.created_at,
    t.shift_id,
    u.first_name || ' ' || u.last_name as cashier_name,
    u.email as cashier_email
FROM transactions t
LEFT JOIN app_users u ON t.user_id = u.user_id
WHERE t.store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86'  -- Store ID from console logs
  AND t.created_at >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY t.created_at DESC
LIMIT 10;

-- 2. Check shifts for this store and user
SELECT 
    'RECENT SHIFTS' as section,
    s.id,
    s.user_id,
    s.store_id,
    s.status,
    s.start_time,
    s.end_time,
    u.first_name || ' ' || u.last_name as cashier_name,
    u.email as cashier_email
FROM shifts s
LEFT JOIN app_users u ON s.user_id = u.user_id
WHERE s.store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86'
  AND s.start_time >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY s.start_time DESC
LIMIT 10;

-- 3. Check the specific user mentioned in the request
SELECT 
    'USER DETAILS' as section,
    user_id,
    first_name,
    last_name,
    email,
    role,
    store_ids,
    is_active
FROM app_users 
WHERE user_id = 'bbbbe3f2-d5eb-4df7-a12b-d56a0b109a27'
   OR email = 'robinsons.north@croffle.com';

-- 4. Check if there are any transactions for the user mentioned
SELECT 
    'USER TRANSACTIONS' as section,
    COUNT(*) as transaction_count,
    SUM(total) as total_sales,
    MIN(created_at) as earliest,
    MAX(created_at) as latest
FROM transactions 
WHERE user_id = 'bbbbe3f2-d5eb-4df7-a12b-d56a0b109a27';

-- 5. Check what the cashier report query would return for today
SELECT 
    'CASHIER REPORT QUERY TEST - TODAY' as section,
    t.user_id,
    COUNT(*) as transaction_count,
    SUM(t.total) as total_sales,
    u.first_name || ' ' || u.last_name as cashier_name
FROM transactions t
LEFT JOIN app_users u ON t.user_id = u.user_id
WHERE t.store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86'
  AND t.status = 'completed'
  AND DATE(t.created_at) = CURRENT_DATE
GROUP BY t.user_id, u.first_name, u.last_name
ORDER BY total_sales DESC;

-- 6. Check what the cashier report query would return for May 26th specifically
SELECT 
    'CASHIER REPORT QUERY TEST - MAY 26' as section,
    t.user_id,
    COUNT(*) as transaction_count,
    SUM(t.total) as total_sales,
    u.first_name || ' ' || u.last_name as cashier_name
FROM transactions t
LEFT JOIN app_users u ON t.user_id = u.user_id
WHERE t.store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86'
  AND t.status = 'completed'
  AND t.created_at >= '2025-05-26T00:00:00'
  AND t.created_at <= '2025-05-26T23:59:59'
GROUP BY t.user_id, u.first_name, u.last_name
ORDER BY total_sales DESC;

-- 7. Check all transactions for this store (any date) to see if any exist
SELECT 
    'ALL STORE TRANSACTIONS' as section,
    COUNT(*) as total_transactions,
    COUNT(DISTINCT user_id) as unique_cashiers,
    SUM(total) as total_sales,
    MIN(created_at) as earliest,
    MAX(created_at) as latest
FROM transactions 
WHERE store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86'
  AND status = 'completed';
