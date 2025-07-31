-- Add missing add-on products to all stores (CORRECTED VERSION)
WITH addon_products AS (
  SELECT 
    unnest(ARRAY['Biscoff Biscuit', 'KitKat', 'Tiramisu', 'Nutella', 'Dark Chocolate', 'Graham Crushed']) as product_name,
    unnest(ARRAY[10, 10, 6, 10, 8, 6]) as price
),
store_categories AS (
  SELECT 
    s.id as store_id,
    s.name as store_name,
    c.id as category_id
  FROM stores s
  LEFT JOIN categories c ON s.id = c.store_id AND c.name = 'Add-on' AND c.is_active = true
  WHERE s.is_active = true
),
max_display_orders AS (
  SELECT 
    pc.store_id,
    COALESCE(MAX(pc.display_order), 0) as max_order
  FROM product_catalog pc
  JOIN store_categories sc ON pc.store_id = sc.store_id AND pc.category_id = sc.category_id
  GROUP BY pc.store_id
)
INSERT INTO product_catalog (
  store_id,
  product_name,
  description,
  price,
  category_id,
  is_available,
  display_order,
  created_at,
  updated_at
)
SELECT 
  sc.store_id,
  ap.product_name,
  'Premium add-on topping',
  ap.price,
  sc.category_id,
  true,
  COALESCE(mdo.max_order, 0) + ROW_NUMBER() OVER (PARTITION BY sc.store_id ORDER BY ap.product_name),
  NOW(),
  NOW()
FROM addon_products ap
CROSS JOIN store_categories sc
LEFT JOIN max_display_orders mdo ON sc.store_id = mdo.store_id
WHERE sc.category_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM product_catalog pc2 
    WHERE pc2.store_id = sc.store_id 
    AND pc2.product_name = ap.product_name 
    AND pc2.category_id = sc.category_id
  );

-- Verify the additions
SELECT 
  s.name as store_name,
  COUNT(pc.id) as new_addons_count,
  ARRAY_AGG(pc.product_name ORDER BY pc.product_name) as added_products
FROM stores s
JOIN categories c ON s.id = c.store_id AND c.name = 'Add-on'
JOIN product_catalog pc ON c.id = pc.category_id
WHERE s.is_active = true
  AND pc.product_name IN ('Biscoff Biscuit', 'KitKat', 'Tiramisu', 'Nutella', 'Dark Chocolate', 'Graham Crushed')
GROUP BY s.id, s.name
ORDER BY s.name;