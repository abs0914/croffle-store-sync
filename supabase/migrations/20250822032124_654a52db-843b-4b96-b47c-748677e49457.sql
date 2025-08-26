-- Create recipes for the remaining 14 products - simplified approach

-- Create recipes first
INSERT INTO recipes (name, store_id, is_active, serving_size, total_cost, cost_per_serving, instructions, created_at, updated_at)
VALUES
  ('Biscoff Biscuit', 'd7c47e6b-f20a-4543-a6bd-000398f72df5', true, 1, 0, 0, 'Serve biscoff biscuit as requested', NOW(), NOW()),
  ('Caramel Latte (Hot)', 'd7c47e6b-f20a-4543-a6bd-000398f72df5', true, 1, 0, 0, 'Prepare hot caramel latte with espresso and steamed milk', NOW(), NOW()),
  ('Caramel Latte (Iced)', 'd7c47e6b-f20a-4543-a6bd-000398f72df5', true, 1, 0, 0, 'Prepare iced caramel latte with espresso and cold milk over ice', NOW(), NOW()),
  ('Caramel Sauce', 'd7c47e6b-f20a-4543-a6bd-000398f72df5', true, 1, 0, 0, 'Drizzle caramel sauce as topping', NOW(), NOW()),
  ('Chocolate Crumbs', 'd7c47e6b-f20a-4543-a6bd-000398f72df5', true, 1, 0, 0, 'Sprinkle chocolate crumbs as topping', NOW(), NOW()),
  ('Cookies & Cream Croffle', 'd7c47e6b-f20a-4543-a6bd-000398f72df5', true, 1, 0, 0, 'Prepare croffle with cookies and cream topping', NOW(), NOW()),
  ('Graham Crushed', 'd7c47e6b-f20a-4543-a6bd-000398f72df5', true, 1, 0, 0, 'Sprinkle crushed graham as topping', NOW(), NOW()),
  ('Iced Tea', 'd7c47e6b-f20a-4543-a6bd-000398f72df5', true, 1, 0, 0, 'Prepare refreshing iced tea', NOW(), NOW()),
  ('Lemonade', 'd7c47e6b-f20a-4543-a6bd-000398f72df5', true, 1, 0, 0, 'Prepare fresh lemonade drink', NOW(), NOW()),
  ('Matcha Blended', 'd7c47e6b-f20a-4543-a6bd-000398f72df5', true, 1, 0, 0, 'Blend matcha with ice and milk', NOW(), NOW()),
  ('Oreo Strawberry', 'd7c47e6b-f20a-4543-a6bd-000398f72df5', true, 1, 0, 0, 'Combine oreo cookies with strawberry flavor', NOW(), NOW()),
  ('Strawberry Kiss', 'd7c47e6b-f20a-4543-a6bd-000398f72df5', true, 1, 0, 0, 'Sweet strawberry flavored dessert', NOW(), NOW()),
  ('Strawberry Latte', 'd7c47e6b-f20a-4543-a6bd-000398f72df5', true, 1, 0, 0, 'Prepare latte with strawberry syrup', NOW(), NOW()),
  ('Vanilla Caramel', 'd7c47e6b-f20a-4543-a6bd-000398f72df5', true, 1, 0, 0, 'Combine vanilla and caramel flavors', NOW(), NOW());

-- Link existing products to the new recipes
UPDATE products 
SET recipe_id = r.id, updated_at = NOW()
FROM recipes r
WHERE products.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND products.name = r.name
  AND products.is_active = true
  AND products.recipe_id IS NULL;

-- Update product catalog to link to recipes
UPDATE product_catalog 
SET recipe_id = r.id, updated_at = NOW()
FROM recipes r
WHERE product_catalog.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND product_catalog.product_name = r.name
  AND product_catalog.recipe_id IS NULL;