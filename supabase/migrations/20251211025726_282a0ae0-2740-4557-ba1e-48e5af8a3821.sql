-- Fix the existing cashier user: set store_ids
UPDATE app_users 
SET store_ids = ARRAY['f6ce7fa1-7218-46b3-838d-a9e77ccdb0cd']::uuid[]
WHERE email = 'cashier.cgate@thecroffle.com' 
  AND (store_ids IS NULL OR store_ids = '{}');

-- Create matching cashiers entry if not exists
INSERT INTO cashiers (user_id, store_id, first_name, last_name, is_active)
SELECT 
  au.user_id, 
  'f6ce7fa1-7218-46b3-838d-a9e77ccdb0cd'::uuid, 
  au.first_name, 
  au.last_name, 
  au.is_active
FROM app_users au
WHERE au.email = 'cashier.cgate@thecroffle.com'
  AND au.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM cashiers c 
    WHERE c.user_id = au.user_id 
      AND c.store_id = 'f6ce7fa1-7218-46b3-838d-a9e77ccdb0cd'::uuid
  );