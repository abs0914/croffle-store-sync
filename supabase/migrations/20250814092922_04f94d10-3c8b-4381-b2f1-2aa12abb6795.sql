-- Update jana.itpark@thecroffle.com user with correct role and store assignment
UPDATE public.app_users 
SET 
  role = 'manager',
  store_ids = ARRAY['d7c47e6b-f20a-4543-a6bd-000398f72df5']::uuid[],
  custom_permissions = jsonb_build_object(
    'user_management', true,
    'inventory_management', true,
    'reports', true
  ),
  updated_at = now()
WHERE email = 'jana.itpark@thecroffle.com';

-- Verify the update
SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  store_ids,
  custom_permissions,
  is_active
FROM public.app_users 
WHERE email = 'jana.itpark@thecroffle.com';