-- Remove the final duplicate for Sugbo Mercado store
DELETE FROM products 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY created_at) as rn
    FROM products 
    WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
    AND LOWER(name) = 'strawberry latte'
    AND price = 99.00
  ) ranked
  WHERE rn > 1
);