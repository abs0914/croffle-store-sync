-- Fix Cashier Report Issues
-- Run these queries step by step to resolve the reporting problems

-- Step 1: Ensure the user exists and has correct permissions
-- Update the user to have proper store access
UPDATE app_users 
SET 
    store_ids = ARRAY['fd45e07e-7832-4f51-b46b-7ef604359b86'::text],
    is_active = true,
    role = 'cashier'
WHERE email = 'robinsons.north@croffle.com';

-- Step 2: Check if we need to create a test transaction for today
-- First, let's see if there's an active shift for today
SELECT 
    'CHECKING ACTIVE SHIFT' as step,
    s.id as shift_id,
    s.user_id,
    s.status,
    s.start_time,
    u.email
FROM shifts s
JOIN app_users u ON s.user_id = u.user_id
WHERE u.email = 'robinsons.north@croffle.com'
  AND s.store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86'
  AND DATE(s.start_time) = CURRENT_DATE;

-- Step 3: Create a shift for today if none exists
INSERT INTO shifts (
    id,
    store_id,
    user_id,
    start_time,
    end_time,
    starting_cash,
    ending_cash,
    status
)
SELECT 
    gen_random_uuid(),
    'fd45e07e-7832-4f51-b46b-7ef604359b86',
    u.user_id,
    CURRENT_DATE + INTERVAL '8 hours',
    CURRENT_DATE + INTERVAL '17 hours',
    2000.00,
    2450.75,
    'completed'
FROM app_users u
WHERE u.email = 'robinsons.north@croffle.com'
  AND NOT EXISTS (
    SELECT 1 FROM shifts s 
    WHERE s.user_id = u.user_id 
      AND s.store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86'
      AND DATE(s.start_time) = CURRENT_DATE
  );

-- Step 4: Create a test transaction for today if none exists
INSERT INTO transactions (
    id,
    shift_id,
    store_id,
    user_id,
    items,
    subtotal,
    tax,
    discount,
    total,
    amount_tendered,
    change,
    payment_method,
    status,
    receipt_number,
    created_at
)
SELECT 
    gen_random_uuid(),
    s.id,
    'fd45e07e-7832-4f51-b46b-7ef604359b86',
    u.user_id,
    '[{"productId":"prod-123","name":"Caramel Delight Mini","quantity":1,"unitPrice":450.75,"totalPrice":450.75}]'::jsonb,
    450.75,
    0.00,
    0.00,
    450.75,
    500.00,
    49.25,
    'cash',
    'completed',
    'RN' || to_char(CURRENT_DATE, 'YYYYMMDD') || '001',
    CURRENT_DATE + INTERVAL '14 hours 30 minutes'  -- 2:30 PM today
FROM app_users u
JOIN shifts s ON s.user_id = u.user_id
WHERE u.email = 'robinsons.north@croffle.com'
  AND s.store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86'
  AND DATE(s.start_time) = CURRENT_DATE
  AND NOT EXISTS (
    SELECT 1 FROM transactions t 
    WHERE t.user_id = u.user_id 
      AND t.store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86'
      AND DATE(t.created_at) = CURRENT_DATE
  );

-- Step 5: Verify the data was created correctly
SELECT 
    'VERIFICATION' as step,
    'SHIFT' as record_type,
    s.id,
    s.user_id,
    s.status,
    s.start_time,
    u.first_name || ' ' || u.last_name as cashier_name,
    u.email
FROM shifts s
JOIN app_users u ON s.user_id = u.user_id
WHERE u.email = 'robinsons.north@croffle.com'
  AND s.store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86'
  AND DATE(s.start_time) = CURRENT_DATE

UNION ALL

SELECT 
    'VERIFICATION' as step,
    'TRANSACTION' as record_type,
    t.id,
    t.user_id,
    t.status,
    t.created_at,
    u.first_name || ' ' || u.last_name as cashier_name,
    u.email
FROM transactions t
JOIN app_users u ON t.user_id = u.user_id
WHERE u.email = 'robinsons.north@croffle.com'
  AND t.store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86'
  AND DATE(t.created_at) = CURRENT_DATE

ORDER BY record_type, start_time;
