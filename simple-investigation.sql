-- Simple Investigation Queries - Fixed PostgreSQL Syntax
-- Run these step by step to understand the cashier report issue

-- 1. Check what stores exist and their IDs
SELECT
    'STORES' as section,
    id,
    name,
    is_active
FROM stores
ORDER BY name;

-- 2. Check the robinsons.north@croffle.com user details
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
WHERE email = 'robinsons.north@croffle.com';

-- 3. Check recent transactions for store fd45e07e-7832-4f51-b46b-7ef604359b86
SELECT
    'RECENT TRANSACTIONS' as section,
    t.id,
    t.user_id,
    t.store_id,
    t.total,
    t.status,
    t.created_at,
    u.first_name || ' ' || u.last_name as cashier_name,
    u.email
FROM transactions t
LEFT JOIN app_users u ON t.user_id = u.user_id
WHERE t.store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86'
  AND t.created_at >= CURRENT_DATE - INTERVAL '2 days'
ORDER BY t.created_at DESC
LIMIT 10;

-- 4. Check recent shifts for store fd45e07e-7832-4f51-b46b-7ef604359b86
SELECT
    'RECENT SHIFTS' as section,
    s.id,
    s.user_id,
    s.store_id,
    s.status,
    s.start_time,
    s.end_time,
    u.first_name || ' ' || u.last_name as cashier_name,
    u.email
FROM shifts s
LEFT JOIN app_users u ON s.user_id = u.user_id
WHERE s.store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86'
  AND s.start_time >= CURRENT_DATE - INTERVAL '2 days'
ORDER BY s.start_time DESC
LIMIT 10;

-- 5. Test today's date range query (what the report uses)
SELECT
    'TODAYS TRANSACTIONS' as section,
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

-- 6. Check all transactions for this store (any date)
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

-- 7. Check cashiers assigned to this store (fixed data type issue)
SELECT
    'STORE CASHIERS' as section,
    user_id,
    first_name || ' ' || last_name as name,
    email,
    store_ids,
    is_active
FROM app_users
WHERE role = 'cashier'
  AND is_active = true
  AND 'fd45e07e-7832-4f51-b46b-7ef604359b86' = ANY(store_ids);

-- 8. Debug current date and timezone
SELECT
    'DATE DEBUG' as section,
    CURRENT_DATE as current_date,
    NOW() as current_timestamp,
    NOW()::date as current_date_from_now,
    EXTRACT(timezone FROM NOW()) as timezone_offset;
