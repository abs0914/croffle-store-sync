-- Add Crushed Oreo and Crushed Grahams add-ons to Sugbo Mercado product catalog

INSERT INTO product_catalog (
  store_id,
  product_name,
  description,
  price,
  category_id,
  is_available,
  product_status,
  product_type,
  display_order,
  created_at,
  updated_at
) VALUES 
(
  'd7c47e6b-f20a-4543-a6bd-000398f72df5', -- Sugbo Mercado store ID
  'Crushed Oreo',
  'Delicious crushed Oreo cookies as topping',
  15.00, -- Price in PHP
  '8a860f1b-c72f-4b0e-8bd3-906234c99e4d', -- Add-ons category ID
  true,
  'available',
  'addon',
  0,
  NOW(),
  NOW()
),
(
  'd7c47e6b-f20a-4543-a6bd-000398f72df5', -- Sugbo Mercado store ID
  'Crushed Grahams',
  'Sweet crushed graham crackers as topping',
  12.00, -- Price in PHP
  '8a860f1b-c72f-4b0e-8bd3-906234c99e4d', -- Add-ons category ID
  true,
  'available',
  'addon',
  0,
  NOW(),
  NOW()
);