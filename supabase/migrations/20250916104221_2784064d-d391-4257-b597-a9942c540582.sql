-- Update existing Oreo Crushed to be properly configured as an add-on and add Crushed Grahams

-- First, update the existing Oreo Crushed product to have proper pricing and category
UPDATE products SET 
  price = 15.00,
  category_id = '8a860f1b-c72f-4b0e-8bd3-906234c99e4d', -- Add-ons category
  name = 'Crushed Oreo',
  updated_at = NOW()
WHERE id = '24c26de2-82ba-42af-8367-b0264df070f5' 
  AND store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Add corresponding product catalog entry for Crushed Oreo
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
) 
SELECT 
  'd7c47e6b-f20a-4543-a6bd-000398f72df5',
  'Crushed Oreo',
  'Delicious crushed Oreo cookies as topping',
  15.00,
  '8a860f1b-c72f-4b0e-8bd3-906234c99e4d', -- Add-ons category
  true,
  'available',
  'addon',
  0,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM product_catalog 
  WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
  AND product_name = 'Crushed Oreo'
);

-- Create Crushed Grahams product
INSERT INTO products (
  store_id,
  name,
  description,
  price,
  category_id,
  is_active,
  product_type,
  sku,
  stock_quantity,
  created_at,
  updated_at
) 
SELECT 
  'd7c47e6b-f20a-4543-a6bd-000398f72df5',
  'Crushed Grahams',
  'Sweet crushed graham crackers as topping',
  12.00,
  '8a860f1b-c72f-4b0e-8bd3-906234c99e4d', -- Add-ons category
  true,
  'addon',
  'CRUSH-GRAH-' || EXTRACT(EPOCH FROM NOW()),
  0,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM products 
  WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
  AND name = 'Crushed Grahams'
);

-- Create corresponding product catalog entry for Crushed Grahams
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
) 
SELECT 
  'd7c47e6b-f20a-4543-a6bd-000398f72df5',
  'Crushed Grahams',
  'Sweet crushed graham crackers as topping',
  12.00,
  '8a860f1b-c72f-4b0e-8bd3-906234c99e4d', -- Add-ons category
  true,
  'available',
  'addon',
  0,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM product_catalog 
  WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
  AND product_name = 'Crushed Grahams'
);