-- Create missing Tiramisu Croffle product catalog entry for Sugbo Mercado IT Park
INSERT INTO product_catalog (
  id,
  store_id,
  product_name,
  description,
  price,
  category_id,
  recipe_id,
  is_available,
  product_status,
  display_order,
  image_url
) VALUES (
  gen_random_uuid(),
  'd7c47e6b-f20a-4543-a6bd-000398f72df5',
  'Tiramisu Croffle',
  'Premium Tiramisu Croffle - our signature dessert with rich coffee-soaked layers',
  125.00,
  'c18d9029-a46d-49b0-9fe4-5d86619c7da6', -- Same category as other croffles
  'd9d60a11-299d-4a11-9468-bfddea1afeb3', -- Link to existing recipe
  true,
  'available',
  2,
  'https://bwmkqscqkfoezcuzgpwq.supabase.co/storage/v1/object/public/recipe-images/templates/recipe-1752297922400-ailne7yddjt.jpg'
);