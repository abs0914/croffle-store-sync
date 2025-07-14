-- Create "Combo" category for all stores
INSERT INTO categories (name, description, store_id, is_active)
SELECT 'Combo', 'Croffle and Espresso combinations', id, true
FROM stores 
WHERE is_active = true
AND NOT EXISTS (
  SELECT 1 FROM categories 
  WHERE name = 'Combo' AND store_id = stores.id
);

-- Create Hot Espresso product for all stores
INSERT INTO products (name, description, price, cost, sku, stock_quantity, category_id, store_id, is_active, product_type)
SELECT 
  'Hot Espresso',
  'Freshly brewed hot espresso',
  50,
  25,
  'ESP-HOT-' || SUBSTRING(s.id::text, 1, 8),
  100,
  c.id,
  s.id,
  true,
  'direct'
FROM stores s
JOIN categories c ON c.store_id = s.id AND c.name = 'Espresso'
WHERE s.is_active = true
AND NOT EXISTS (
  SELECT 1 FROM products p 
  WHERE p.name = 'Hot Espresso' AND p.store_id = s.id
);

-- Create Iced Espresso product for all stores  
INSERT INTO products (name, description, price, cost, sku, stock_quantity, category_id, store_id, is_active, product_type)
SELECT 
  'Iced Espresso',
  'Refreshing iced espresso',
  55,
  28,
  'ESP-ICE-' || SUBSTRING(s.id::text, 1, 8),
  100,
  c.id,
  s.id,
  true,
  'direct'
FROM stores s
JOIN categories c ON c.store_id = s.id AND c.name = 'Espresso'
WHERE s.is_active = true
AND NOT EXISTS (
  SELECT 1 FROM products p 
  WHERE p.name = 'Iced Espresso' AND p.store_id = s.id
);

-- Create Espresso category if it doesn't exist
INSERT INTO categories (name, description, store_id, is_active)
SELECT 'Espresso', 'Coffee drinks', id, true
FROM stores 
WHERE is_active = true
AND NOT EXISTS (
  SELECT 1 FROM categories 
  WHERE name = 'Espresso' AND store_id = stores.id
);

-- Now create the espresso products with the correct category
INSERT INTO products (name, description, price, cost, sku, stock_quantity, category_id, store_id, is_active, product_type)
SELECT 
  'Hot Espresso',
  'Freshly brewed hot espresso',
  50,
  25,
  'ESP-HOT-' || SUBSTRING(s.id::text, 1, 8),
  100,
  c.id,
  s.id,
  true,
  'direct'
FROM stores s
JOIN categories c ON c.store_id = s.id AND c.name = 'Espresso'
WHERE s.is_active = true
AND NOT EXISTS (
  SELECT 1 FROM products p 
  WHERE p.name = 'Hot Espresso' AND p.store_id = s.id
);

INSERT INTO products (name, description, price, cost, sku, stock_quantity, category_id, store_id, is_active, product_type)
SELECT 
  'Iced Espresso',
  'Refreshing iced espresso',
  55,
  28,
  'ESP-ICE-' || SUBSTRING(s.id::text, 1, 8),
  100,
  c.id,
  s.id,
  true,
  'direct'
FROM stores s
JOIN categories c ON c.store_id = s.id AND c.name = 'Espresso'
WHERE s.is_active = true
AND NOT EXISTS (
  SELECT 1 FROM products p 
  WHERE p.name = 'Iced Espresso' AND p.store_id = s.id
);

-- Update Glaze Croffle price to ₱79
UPDATE products 
SET price = 79, updated_at = NOW()
WHERE name = 'Glaze Croffle';

-- Clear existing combo pricing rules and insert standardized ones
DELETE FROM combo_pricing_rules;

-- Insert combo pricing rules for each croffle category with espresso
INSERT INTO combo_pricing_rules (name, base_category, combo_category, combo_price, discount_amount, is_active, priority) VALUES
-- Classic + Espresso combos
('Classic + Hot Espresso', 'Classic', 'Espresso', 130, 0, true, 1),
('Classic + Iced Espresso', 'Classic', 'Espresso', 135, 0, true, 1),

-- Glaze + Espresso combos  
('Glaze + Hot Espresso', 'Glaze', 'Espresso', 129, 0, true, 1),
('Glaze + Iced Espresso', 'Glaze', 'Espresso', 134, 0, true, 1),

-- Fruity + Espresso combos
('Fruity + Hot Espresso', 'Fruity', 'Espresso', 140, 0, true, 1),
('Fruity + Iced Espresso', 'Fruity', 'Espresso', 145, 0, true, 1),

-- Premium + Espresso combos
('Premium + Hot Espresso', 'Premium', 'Espresso', 165, 0, true, 1),
('Premium + Iced Espresso', 'Premium', 'Espresso', 170, 0, true, 1);