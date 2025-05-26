-- Cleanup script to remove test cashier data
-- Run this after testing to clean up the test records

-- Remove test transactions
DELETE FROM transactions WHERE id LIKE 'test-tx-%';

-- Remove test shifts  
DELETE FROM shifts WHERE id LIKE 'test-shift-%';

-- Remove test app_users
DELETE FROM app_users WHERE user_id LIKE 'test-user-%';

-- Verify cleanup (should return 0 for all)
SELECT 'transactions' as table_name, COUNT(*) as remaining_test_records 
FROM transactions WHERE id LIKE 'test-tx-%'
UNION ALL
SELECT 'shifts' as table_name, COUNT(*) as remaining_test_records 
FROM shifts WHERE id LIKE 'test-shift-%'
UNION ALL  
SELECT 'app_users' as table_name, COUNT(*) as remaining_test_records 
FROM app_users WHERE user_id LIKE 'test-user-%';
