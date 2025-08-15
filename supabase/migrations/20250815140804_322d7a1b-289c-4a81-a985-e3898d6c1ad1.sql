-- Clean up duplicate Espresso products - keep one active entry per store per product
-- For each combination of (store_id, product_name), keep the most recent entry and deactivate others

-- Create a temporary table to identify which records to keep
WITH ranked_products AS (
  SELECT id, name, store_id, price, created_at,
         ROW_NUMBER() OVER (PARTITION BY store_id, name ORDER BY created_at DESC, id) as rn
  FROM products 
  WHERE name IN ('Hot Americano', 'Iced Americano', 'Hot Latte', 'Iced Latte', 'Caramel Latte', 'Strawberry Latte')
  AND is_active = true
),
products_to_deactivate AS (
  SELECT id 
  FROM ranked_products 
  WHERE rn > 1
)
-- Deactivate duplicate entries (keep only the most recent one per store per product)
UPDATE products 
SET is_active = false 
WHERE id IN (SELECT id FROM products_to_deactivate);