-- Create missing cashier record for cashier.itpark@thecroffle.com
INSERT INTO cashiers (
  user_id,
  store_id,
  first_name,
  last_name,
  is_active
)
SELECT
  '922399f5-95a3-49a6-959c-257a1bc7f5c1'::uuid,
  'd7c47e6b-f20a-4543-a6bd-000398f72df5'::uuid,
  'Cashier',
  'IT Park',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM cashiers 
  WHERE user_id = '922399f5-95a3-49a6-959c-257a1bc7f5c1'::uuid
);