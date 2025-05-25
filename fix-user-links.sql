-- Fix user linking between app_users and auth.users tables
-- Run this in Supabase SQL Editor

-- Link admin@example.com
UPDATE app_users 
SET user_id = (SELECT id FROM auth.users WHERE email = 'admin@example.com')
WHERE email = 'admin@example.com';

-- Link rbsons.north.manager@croffle.com  
UPDATE app_users 
SET user_id = (SELECT id FROM auth.users WHERE email = 'rbsons.north.manager@croffle.com')
WHERE email = 'rbsons.north.manager@croffle.com';

-- Link robinsons.north@croffle.com
UPDATE app_users 
SET user_id = (SELECT id FROM auth.users WHERE email = 'robinsons.north@croffle.com')
WHERE email = 'robinsons.north@croffle.com';

-- Link marasabaras@croffle.com
UPDATE app_users 
SET user_id = (SELECT id FROM auth.users WHERE email = 'marasabaras@croffle.com')
WHERE email = 'marasabaras@croffle.com';

-- Verify the links were created
SELECT 
  au.email,
  au.role,
  au.user_id,
  CASE 
    WHEN au.user_id IS NOT NULL THEN '✅ Linked'
    ELSE '❌ Not Linked'
  END as status
FROM app_users au
ORDER BY au.email;
