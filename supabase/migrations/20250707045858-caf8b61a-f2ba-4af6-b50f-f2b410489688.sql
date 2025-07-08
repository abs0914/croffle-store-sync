-- Sync the manager user to app_users table
SELECT public.sync_auth_user_to_app_users(
  'manager.itpark@thecroffle.com',
  'Manager',
  'IT Park',
  'manager',
  ARRAY['a12a8269-5cbc-4a78-bae0-d6f166e1446d']::UUID[], -- Sugbo Mercado (IT Park, Cebu) store
  '09171234567'
);