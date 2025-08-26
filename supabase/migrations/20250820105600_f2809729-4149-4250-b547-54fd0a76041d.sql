-- Step 1: Fix orphaned transaction items first by creating temporary products if needed
-- Insert missing products that transaction_items are referencing
INSERT INTO products (name, description, price, cost, sku, stock_quantity, category_id, store_id, is_active, product_type)
SELECT DISTINCT
  ti.product_type as name,
  'Auto-created for transaction sync' as description,
  125.00 as price,
  87.50 as cost,
  'TEMP-' || UPPER(SUBSTRING(REPLACE(ti.product_type, ' ', ''), 1, 10)) || '-' || LEFT(t.store_id::text, 8) as sku,
  100 as stock_quantity,
  (SELECT id FROM categories WHERE store_id = t.store_id AND name = 'Desserts' LIMIT 1) as category_id,
  t.store_id,
  true as is_active,
  'recipe' as product_type
FROM transaction_items ti
JOIN transactions t ON ti.transaction_id = t.id
LEFT JOIN products p ON ti.product_id = p.id
WHERE ti.product_type IN ('Tiramisu Croffle', 'Caramel Delight')
AND p.id IS NULL
ON CONFLICT (name, store_id) DO NOTHING;

-- Update orphaned transaction_items to reference the correct products
UPDATE transaction_items 
SET product_id = (
  SELECT p.id 
  FROM products p 
  JOIN transactions t ON t.id = transaction_items.transaction_id
  WHERE p.name = transaction_items.product_type
  AND p.store_id = t.store_id
  LIMIT 1
)
WHERE product_id NOT IN (SELECT id FROM products)
AND product_type IN ('Tiramisu Croffle', 'Caramel Delight');

-- Now clean up actual duplicates, keeping the ones with recipe_id
WITH ranked_products AS (
  SELECT 
    id,
    name,
    store_id,
    recipe_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY name, store_id 
      ORDER BY 
        CASE WHEN recipe_id IS NOT NULL THEN 0 ELSE 1 END,
        created_at DESC
    ) as rn
  FROM products 
  WHERE name IN ('Tiramisu Croffle', 'Caramel Delight')
)
DELETE FROM products 
WHERE id IN (
  SELECT id FROM ranked_products WHERE rn > 1
);