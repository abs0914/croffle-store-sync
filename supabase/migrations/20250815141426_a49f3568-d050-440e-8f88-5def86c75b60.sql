-- Sync cleaned Espresso products from products table to product_catalog table
-- This ensures they appear in the POS system

INSERT INTO product_catalog (product_name, description, price, store_id, recipe_id, is_available, display_order, created_at, updated_at)
SELECT 
  p.name as product_name,
  p.description,
  p.price,
  p.store_id,
  p.recipe_id,
  true as is_available,
  (CASE 
    WHEN p.name = 'Hot Americano' THEN 1
    WHEN p.name = 'Iced Americano' THEN 2  
    WHEN p.name = 'Hot Latte' THEN 3
    WHEN p.name = 'Iced Latte' THEN 4
    WHEN p.name = 'Caramel Latte' THEN 5
    WHEN p.name = 'Strawberry Latte' THEN 6
    ELSE 10
  END) as display_order,
  now() as created_at,
  now() as updated_at
FROM products p
WHERE p.name IN ('Hot Americano', 'Iced Americano', 'Hot Latte', 'Iced Latte', 'Caramel Latte', 'Strawberry Latte')
  AND p.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM product_catalog pc 
    WHERE pc.product_name = p.name 
    AND pc.store_id = p.store_id 
    AND pc.is_available = true
  );