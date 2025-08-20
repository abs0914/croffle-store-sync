-- Fix remaining Strawberry Latte issues

-- Step 1: Remove duplicate "Strawberry Latte" entries in products table
-- Keep only the first one per store (by created_at)
DELETE FROM products p1
WHERE LOWER(p1.name) = 'strawberry latte' 
AND p1.price = 99.00
AND EXISTS (
  SELECT 1 FROM products p2 
  WHERE p2.store_id = p1.store_id 
  AND LOWER(p2.name) = 'strawberry latte'
  AND p2.price = 99.00
  AND p2.created_at < p1.created_at
);

-- Step 2: Fix the one store that has "Blended" category instead of "Cold"
-- Update products table entry for store d7c47e6b-f20a-4543-a6bd-000398f72df5
UPDATE products 
SET category_id = (
  SELECT id FROM categories 
  WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
  AND LOWER(name) = 'cold'
  LIMIT 1
)
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
AND LOWER(name) = 'strawberry latte'
AND price = 99.00;

-- Step 3: Fix the corresponding product_catalog entry
UPDATE product_catalog 
SET category_id = (
  SELECT id FROM categories 
  WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
  AND LOWER(name) = 'cold'
  LIMIT 1
)
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
AND LOWER(product_name) = 'strawberry latte'
AND price = 99.00;