-- Add products to product_catalog table instead of products table

-- Add Blended products to product_catalog for all stores
WITH blended_categories AS (
  SELECT c.id as category_id, c.store_id
  FROM categories c
  WHERE c.name = 'Blended' AND c.is_active = true
),
blended_products AS (
  VALUES 
    ('Strawberry Kiss', 'Refreshing strawberry blended drink', 110),
    ('Matcha', 'Rich matcha blended beverage', 90),
    ('Oreo Strawberry', 'Creamy Oreo strawberry blend', 110)
)
INSERT INTO product_catalog (product_name, description, price, category_id, store_id, is_available, display_order)
SELECT 
  bp.column1 as product_name,
  bp.column2 as description,
  bp.column3 as price,
  bc.category_id,
  bc.store_id,
  true as is_available,
  0 as display_order
FROM blended_categories bc
CROSS JOIN blended_products bp
WHERE NOT EXISTS (
  SELECT 1 FROM product_catalog pc 
  WHERE pc.product_name = bp.column1 AND pc.store_id = bc.store_id
);

-- Add Cold products to product_catalog for all stores
WITH cold_categories AS (
  SELECT c.id as category_id, c.store_id
  FROM categories c
  WHERE c.name = 'Cold' AND c.is_active = true
),
cold_products AS (
  VALUES 
    ('Vanilla Caramel', 'Smooth vanilla caramel cold drink', 90),
    ('Strawberry Latte', 'Fresh strawberry latte served cold', 99),
    ('Iced Tea', 'Refreshing iced tea', 60),
    ('Lemonade', 'Fresh squeezed lemonade', 60)
)
INSERT INTO product_catalog (product_name, description, price, category_id, store_id, is_available, display_order)
SELECT 
  cp.column1 as product_name,
  cp.column2 as description,
  cp.column3 as price,
  cc.category_id,
  cc.store_id,
  true as is_available,
  0 as display_order
FROM cold_categories cc
CROSS JOIN cold_products cp
WHERE NOT EXISTS (
  SELECT 1 FROM product_catalog pc 
  WHERE pc.product_name = cp.column1 AND pc.store_id = cc.store_id
);