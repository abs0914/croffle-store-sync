-- Make Matcha Blended available for sale at Sugbo Mercado store
-- Update products table
UPDATE products 
SET is_active = true, price = 140.00
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
AND LOWER(name) = 'matcha blended';

-- Update product_catalog table
UPDATE product_catalog 
SET is_available = true, price = 140.00
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
AND LOWER(product_name) = 'matcha blended';