-- Fix the Glaze Croffle pricing issue in Sugbo Mercado store
UPDATE product_catalog 
SET price = 79.00, 
    updated_at = NOW()
WHERE product_name = 'Glaze Croffle' 
  AND price = 3990.00 
  AND store_id IN (
    SELECT id FROM stores WHERE name = 'Sugbo Mercado'
  );