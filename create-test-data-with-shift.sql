-- Create test data for rbnorth cashier with proper shift_id
-- Run these in your database console

-- Step 1: First create a shift for today
INSERT INTO shifts (
    id, 
    store_id, 
    user_id, 
    start_time, 
    end_time, 
    starting_cash, 
    ending_cash, 
    status
) VALUES (
    gen_random_uuid(),
    'a12a8269-5cbc-4a78-bae0-d6f166e1446d',  -- Robinsons North
    'c21d1e53-8379-454c-b97e-d51d1ee76c99',  -- rbnorth cashier
    CURRENT_DATE + INTERVAL '8 hours',        -- 8 AM today
    CURRENT_DATE + INTERVAL '17 hours',       -- 5 PM today
    2000.00,                                  -- Starting cash
    2450.75,                                  -- Ending cash
    'completed'
);

-- Step 2: Get the shift ID we just created
-- (You'll need to run this to get the shift_id for the transaction)
SELECT id as shift_id, user_id, start_time 
FROM shifts 
WHERE user_id = 'c21d1e53-8379-454c-b97e-d51d1ee76c99' 
  AND store_id = 'a12a8269-5cbc-4a78-bae0-d6f166e1446d'
  AND DATE(start_time) = CURRENT_DATE
ORDER BY created_at DESC 
LIMIT 1;

-- Step 3: Create transaction with the shift_id
-- Replace 'YOUR_SHIFT_ID_HERE' with the actual shift_id from step 2
/*
INSERT INTO transactions (
    id,
    shift_id,
    store_id, 
    user_id,
    subtotal,
    tax,
    discount,
    total,
    payment_method,
    status,
    created_at
) VALUES (
    gen_random_uuid(),
    'YOUR_SHIFT_ID_HERE',  -- Replace with actual shift_id
    'a12a8269-5cbc-4a78-bae0-d6f166e1446d',  -- Robinsons North
    'c21d1e53-8379-454c-b97e-d51d1ee76c99',  -- rbnorth cashier
    400.00,
    50.75,
    0.00,
    450.75,
    'cash',
    'completed',
    CURRENT_TIMESTAMP
);
*/
