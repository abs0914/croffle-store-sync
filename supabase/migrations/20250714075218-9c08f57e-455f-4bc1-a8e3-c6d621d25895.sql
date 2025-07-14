-- Drop the unique constraint temporarily to allow multiple rules for same category combinations
ALTER TABLE combo_pricing_rules DROP CONSTRAINT IF EXISTS combo_pricing_rules_base_category_combo_category_key;

-- Create "Combo" category for all stores
INSERT INTO categories (name, description, store_id, is_active)
SELECT 'Combo', 'Croffle and Espresso combinations', id, true
FROM stores 
WHERE is_active = true
AND NOT EXISTS (
  SELECT 1 FROM categories 
  WHERE name = 'Combo' AND store_id = stores.id
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

-- Update Glaze Croffle price to ₱79
UPDATE products 
SET price = 79, updated_at = NOW()
WHERE name = 'Glaze Croffle';

-- Clear all existing combo pricing rules
DELETE FROM combo_pricing_rules;

-- Insert new combo pricing rules for croffle categories with espresso
INSERT INTO combo_pricing_rules (name, base_category, combo_category, combo_price, discount_amount, is_active, priority) VALUES
-- Classic + Espresso combos
('Classic + Hot Espresso', 'Classic', 'Hot Espresso', 130, 0, true, 1),
('Classic + Iced Espresso', 'Classic', 'Iced Espresso', 135, 0, true, 2),

-- Glaze + Espresso combos  
('Glaze + Hot Espresso', 'Glaze', 'Hot Espresso', 129, 0, true, 3),
('Glaze + Iced Espresso', 'Glaze', 'Iced Espresso', 134, 0, true, 4),

-- Fruity + Espresso combos
('Fruity + Hot Espresso', 'Fruity', 'Hot Espresso', 140, 0, true, 5),
('Fruity + Iced Espresso', 'Fruity', 'Iced Espresso', 145, 0, true, 6),

-- Premium + Espresso combos
('Premium + Hot Espresso', 'Premium', 'Hot Espresso', 165, 0, true, 7),
('Premium + Iced Espresso', 'Premium', 'Iced Espresso', 170, 0, true, 8),

-- Mini Croffle combos
('Mini Croffle + Hot Espresso', 'Mini Croffle', 'Hot Espresso', 110, 0, true, 9),
('Mini Croffle + Iced Espresso', 'Mini Croffle', 'Iced Espresso', 115, 0, true, 10);