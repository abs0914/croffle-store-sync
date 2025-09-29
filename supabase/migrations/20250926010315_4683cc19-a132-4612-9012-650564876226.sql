-- Assign SM City Cebu store to cashier.smcebu@thecroffle.com
-- First get the correct store ID and user ID, then update
WITH store_info AS (
  SELECT id as store_id FROM stores WHERE name ILIKE '%SM City Cebu%' OR name ILIKE '%SM%Cebu%' LIMIT 1
),
user_info AS (
  SELECT id as user_id FROM app_users WHERE email = 'cashier.smcebu@thecroffle.com'
)
UPDATE app_users 
SET store_ids = ARRAY[(SELECT store_id FROM store_info)],
    updated_at = now()
FROM user_info
WHERE app_users.id = user_info.user_id;