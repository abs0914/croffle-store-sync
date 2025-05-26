-- Test Database Permissions for Robinsons North Cashier
-- Run these to check if there are permission issues

-- 1. Check current user context
SELECT 
    'CURRENT USER CONTEXT' as section,
    current_user as database_user,
    session_user as session_user,
    current_setting('role') as current_role;

-- 2. Test access to app_users table
SELECT 
    'APP_USERS ACCESS TEST' as section,
    COUNT(*) as total_users,
    COUNT(CASE WHEN role = 'cashier' THEN 1 END) as cashier_count
FROM app_users 
WHERE is_active = true;

-- 3. Test access to transactions table
SELECT 
    'TRANSACTIONS ACCESS TEST' as section,
    COUNT(*) as total_transactions,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transactions
FROM transactions;

-- 4. Test access to shifts table
SELECT 
    'SHIFTS ACCESS TEST' as section,
    COUNT(*) as total_shifts,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_shifts
FROM shifts;

-- 5. Test access to stores table
SELECT 
    'STORES ACCESS TEST' as section,
    COUNT(*) as total_stores,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_stores
FROM stores;

-- 6. Check RLS policies on transactions table
SELECT 
    'TRANSACTIONS RLS POLICIES' as section,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'transactions';

-- 7. Check RLS policies on app_users table
SELECT 
    'APP_USERS RLS POLICIES' as section,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'app_users';

-- 8. Check if RLS is enabled on key tables
SELECT 
    'RLS STATUS' as section,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('transactions', 'app_users', 'shifts', 'stores')
  AND schemaname = 'public';
