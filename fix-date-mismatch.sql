-- Fix Date Mismatch - Update test data to May 26th, 2025
-- Run these queries in your database console

-- Step 1: Update the shift to May 26th, 2025
UPDATE shifts 
SET 
    start_time = '2025-05-26 08:00:00+00'::timestamptz,
    end_time = '2025-05-26 17:00:00+00'::timestamptz,
    created_at = '2025-05-26 08:00:00+00'::timestamptz
WHERE user_id = 'c21d1e53-8379-454c-b97e-d51d1ee76c99'  -- rbnorth cashier
  AND store_id = 'a12a8269-5cbc-4a78-bae0-d6f166e1446d'  -- Robinsons North
  AND DATE(created_at) = CURRENT_DATE;  -- Today's records

-- Step 2: Update the transaction to May 26th, 2025
UPDATE transactions 
SET created_at = '2025-05-26 14:30:00+00'::timestamptz  -- 2:30 PM on May 26th
WHERE user_id = 'c21d1e53-8379-454c-b97e-d51d1ee76c99'  -- rbnorth cashier
  AND store_id = 'a12a8269-5cbc-4a78-bae0-d6f166e1446d'  -- Robinsons North
  AND DATE(created_at) = CURRENT_DATE;  -- Today's records

-- Step 3: Verify the updates worked
SELECT 
    'SHIFT' as record_type,
    s.id,
    s.start_time,
    s.end_time,
    s.status,
    u.first_name || ' ' || u.last_name as cashier_name
FROM shifts s
JOIN app_users u ON s.user_id = u.user_id
WHERE s.user_id = 'c21d1e53-8379-454c-b97e-d51d1ee76c99'
  AND s.store_id = 'a12a8269-5cbc-4a78-bae0-d6f166e1446d'
  AND DATE(s.start_time) = '2025-05-26'

UNION ALL

SELECT 
    'TRANSACTION' as record_type,
    t.id,
    t.created_at,
    NULL as end_time,
    t.status,
    u.first_name || ' ' || u.last_name as cashier_name
FROM transactions t
JOIN app_users u ON t.user_id = u.user_id
WHERE t.user_id = 'c21d1e53-8379-454c-b97e-d51d1ee76c99'
  AND t.store_id = 'a12a8269-5cbc-4a78-bae0-d6f166e1446d'
  AND DATE(t.created_at) = '2025-05-26'

ORDER BY record_type, start_time;

-- Step 4: Double-check the date range query that the API uses
SELECT 
    COUNT(*) as transaction_count,
    SUM(total) as total_sales,
    MIN(created_at) as earliest_transaction,
    MAX(created_at) as latest_transaction
FROM transactions 
WHERE store_id = 'a12a8269-5cbc-4a78-bae0-d6f166e1446d'
  AND DATE(created_at) = '2025-05-26';

SELECT 
    COUNT(*) as shift_count,
    MIN(start_time) as earliest_shift,
    MAX(end_time) as latest_shift
FROM shifts 
WHERE store_id = 'a12a8269-5cbc-4a78-bae0-d6f166e1446d'
  AND DATE(start_time) = '2025-05-26';
