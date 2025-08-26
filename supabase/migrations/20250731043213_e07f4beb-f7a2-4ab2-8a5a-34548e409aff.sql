-- Add Matcha Blended drink to product catalog
-- First, get the Blended category ID and store ID from existing data

INSERT INTO product_catalog (
  store_id, 
  product_name, 
  description, 
  price, 
  is_available, 
  display_order,
  category_id
)
SELECT 
  s.id as store_id,
  'Matcha Blended' as product_name,
  'Refreshing matcha blended drink' as description,
  90.00 as price,
  true as is_available,
  0 as display_order,
  c.id as category_id
FROM stores s
CROSS JOIN categories c
WHERE c.name = 'Blended'
  AND s.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM product_catalog pc 
    WHERE pc.product_name = 'Matcha Blended' 
    AND pc.store_id = s.id
  );