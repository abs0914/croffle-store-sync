-- Add Blended and Cold categories and products to all active stores

-- First, create categories for all active stores
INSERT INTO categories (name, description, store_id, is_active)
SELECT 
  'Blended',
  'Blended beverages and specialty drinks',
  s.id,
  true
FROM stores s 
WHERE s.is_active = true
AND NOT EXISTS (
  SELECT 1 FROM categories c 
  WHERE c.name = 'Blended' AND c.store_id = s.id
);

INSERT INTO categories (name, description, store_id, is_active)
SELECT 
  'Cold',
  'Cold beverages and refreshing drinks',
  s.id,
  true
FROM stores s 
WHERE s.is_active = true
AND NOT EXISTS (
  SELECT 1 FROM categories c 
  WHERE c.name = 'Cold' AND c.store_id = s.id
);

-- Add Blended products for all stores
WITH blended_categories AS (
  SELECT c.id as category_id, c.store_id
  FROM categories c
  WHERE c.name = 'Blended' AND c.is_active = true
),
blended_products AS (
  VALUES 
    ('Strawberry Kiss', 110),
    ('Matcha', 90),
    ('Oreo Strawberry', 110)
)
INSERT INTO products (name, price, cost, sku, stock_quantity, category_id, store_id, is_active)
SELECT 
  bp.column1 as name,
  bp.column2 as price,
  bp.column2 * 0.6 as cost, -- Estimated 60% cost ratio
  'BLD-' || UPPER(REPLACE(bp.column1, ' ', '-')) || '-' || SUBSTRING(bc.store_id::text, 1, 8) as sku,
  100 as stock_quantity,
  bc.category_id,
  bc.store_id,
  true as is_active
FROM blended_categories bc
CROSS JOIN blended_products bp
WHERE NOT EXISTS (
  SELECT 1 FROM products p 
  WHERE p.name = bp.column1 AND p.store_id = bc.store_id
);

-- Add Cold products for all stores
WITH cold_categories AS (
  SELECT c.id as category_id, c.store_id
  FROM categories c
  WHERE c.name = 'Cold' AND c.is_active = true
),
cold_products AS (
  VALUES 
    ('Vanilla Caramel', 90),
    ('Strawberry Latte', 99),
    ('Iced Tea', 60),
    ('Lemonade', 60)
)
INSERT INTO products (name, price, cost, sku, stock_quantity, category_id, store_id, is_active)
SELECT 
  cp.column1 as name,
  cp.column2 as price,
  cp.column2 * 0.6 as cost, -- Estimated 60% cost ratio
  'CLD-' || UPPER(REPLACE(cp.column1, ' ', '-')) || '-' || SUBSTRING(cc.store_id::text, 1, 8) as sku,
  100 as stock_quantity,
  cc.category_id,
  cc.store_id,
  true as is_active
FROM cold_categories cc
CROSS JOIN cold_products cp
WHERE NOT EXISTS (
  SELECT 1 FROM products p 
  WHERE p.name = cp.column1 AND p.store_id = cc.store_id
);