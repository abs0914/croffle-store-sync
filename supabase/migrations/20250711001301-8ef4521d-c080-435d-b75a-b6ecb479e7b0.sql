-- Update existing deployed recipes to use proper pricing from deployment options
-- Also add image support where available

-- Update Nutella and Blueberry products to use the ₱125 price from the deployment dialog
UPDATE product_catalog 
SET price = 125.00
WHERE product_name IN ('Nutella', 'Blueberry') 
  AND store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND price = 50.00;

-- Also update the products table for consistency
UPDATE products 
SET price = 125.00
WHERE name IN ('Nutella', 'Blueberry') 
  AND store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND price = 50.00;