-- Fix KitKat and Nutella croffle pricing in Premium category
-- These should be ₱125 like other premium croffles

UPDATE product_catalog 
SET price = 125.00
WHERE product_name IN ('KitKat Special', 'Nutella Special')
  AND category_id IN (
    SELECT id FROM categories WHERE name = 'Premium'
  );