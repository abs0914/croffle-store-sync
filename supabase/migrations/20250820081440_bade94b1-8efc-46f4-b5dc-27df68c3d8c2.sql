-- Update product_catalog table to make Matcha Blended available
UPDATE product_catalog 
SET is_available = true, price = 140.00
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
AND LOWER(product_name) = 'matcha blended';