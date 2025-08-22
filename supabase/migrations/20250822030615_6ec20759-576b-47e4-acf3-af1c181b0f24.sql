-- Create recipes for existing products that need them
-- This approach avoids the sync trigger conflict by working with existing products

-- First, create the recipes
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

-- Now add ingredients to each recipe
-- Biscoff Biscuit
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT r.id, 'Biscoff', 1, 'Portion'::inventory_unit, 0, ist.id
FROM recipes r, inventory_stock ist
WHERE r.name = 'Biscoff Biscuit' AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.item = 'Biscoff' AND ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Caramel Latte (Hot) 
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT r.id, ist.item, 
  CASE 
    WHEN ist.item = 'Coffee Beans' THEN 20
    WHEN ist.item = 'Milk' THEN 150
    WHEN ist.item = 'Caramel ' THEN 1
    WHEN ist.item = '12oz Hot Cups' THEN 1
    ELSE 1
  END,
  ist.unit::inventory_unit,
  CASE 
    WHEN ist.item = 'Coffee Beans' THEN 1.04
    WHEN ist.item = 'Milk' THEN 0.085
    WHEN ist.item = 'Caramel ' THEN 0
    WHEN ist.item = '12oz Hot Cups' THEN 0
    ELSE 0
  END,
  ist.id
FROM recipes r, inventory_stock ist
WHERE r.name = 'Caramel Latte (Hot)' AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.item IN ('Coffee Beans', 'Milk', 'Caramel ', '12oz Hot Cups')
  AND ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Caramel Latte (Iced)
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT r.id, ist.item,
  CASE 
    WHEN ist.item = 'Coffee Beans' THEN 20
    WHEN ist.item = 'Milk' THEN 150
    WHEN ist.item = 'Caramel ' THEN 1
    WHEN ist.item = '16oz Plastic Cups' THEN 1
    ELSE 1
  END,
  ist.unit::inventory_unit,
  CASE 
    WHEN ist.item = 'Coffee Beans' THEN 1.04
    WHEN ist.item = 'Milk' THEN 0.085
    WHEN ist.item = 'Caramel ' THEN 0
    WHEN ist.item = '16oz Plastic Cups' THEN 0
    ELSE 0
  END,
  ist.id
FROM recipes r, inventory_stock ist
WHERE r.name = 'Caramel Latte (Iced)' AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.item IN ('Coffee Beans', 'Milk', 'Caramel ', '16oz Plastic Cups')
  AND ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Caramel Sauce
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT r.id, 'Caramel Sauce for Coffee', 1, 'Pieces'::inventory_unit, 0, ist.id
FROM recipes r, inventory_stock ist
WHERE r.name = 'Caramel Sauce' AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.item = 'Caramel Sauce for Coffee' AND ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Chocolate Crumbs
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT r.id, 'Chocolate Crumble', 1, 'Portion'::inventory_unit, 0, ist.id
FROM recipes r, inventory_stock ist
WHERE r.name = 'Chocolate Crumbs' AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.item = 'Chocolate Crumble' AND ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Cookies & Cream Croffle
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT r.id, ist.item,
  CASE 
    WHEN ist.item = 'Regular Croissant' THEN 1
    WHEN ist.item = 'Oreo Cookie' THEN 3
    WHEN ist.item = 'Crushed Oreo' THEN 10
    ELSE 1
  END,
  ist.unit::inventory_unit,
  CASE 
    WHEN ist.item = 'Regular Croissant' THEN 2100
    WHEN ist.item = 'Oreo Cookie' THEN 2.96
    WHEN ist.item = 'Crushed Oreo' THEN 2.5
    ELSE 0
  END,
  ist.id
FROM recipes r, inventory_stock ist
WHERE r.name = 'Cookies & Cream Croffle' AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.item IN ('Regular Croissant', 'Oreo Cookie', 'Crushed Oreo')
  AND ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Graham Crushed
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT r.id, 'Graham Crushed', 1, 'Portion'::inventory_unit, 0, ist.id
FROM recipes r, inventory_stock ist
WHERE r.name = 'Graham Crushed' AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.item = 'Graham Crushed' AND ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Iced Tea
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT r.id, ist.item,
  CASE 
    WHEN ist.item = 'Iced Tea Powder' THEN 30
    WHEN ist.item = '16oz Plastic Cups' THEN 1
    ELSE 1
  END,
  ist.unit::inventory_unit,
  CASE 
    WHEN ist.item = 'Iced Tea Powder' THEN 90.00
    WHEN ist.item = '16oz Plastic Cups' THEN 0
    ELSE 0
  END,
  ist.id
FROM recipes r, inventory_stock ist
WHERE r.name = 'Iced Tea' AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.item IN ('Iced Tea Powder', '16oz Plastic Cups')
  AND ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Lemonade
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT r.id, ist.item,
  CASE 
    WHEN ist.item = 'Lemonade Powder (Cucumber)' THEN 30
    WHEN ist.item = '16oz Plastic Cups' THEN 1
    ELSE 1
  END,
  ist.unit::inventory_unit,
  CASE 
    WHEN ist.item = 'Lemonade Powder (Cucumber)' THEN 80.00
    WHEN ist.item = '16oz Plastic Cups' THEN 0
    ELSE 0
  END,
  ist.id
FROM recipes r, inventory_stock ist
WHERE r.name = 'Lemonade' AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.item IN ('Lemonade Powder (Cucumber)', '16oz Plastic Cups')
  AND ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Matcha Blended
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT r.id, ist.item,
  CASE 
    WHEN ist.item = 'Matcha Powder' THEN 15
    WHEN ist.item = 'Milk' THEN 200
    WHEN ist.item = '16oz Plastic Cups' THEN 1
    ELSE 1
  END,
  ist.unit::inventory_unit,
  CASE 
    WHEN ist.item = 'Matcha Powder' THEN 200.00
    WHEN ist.item = 'Milk' THEN 0.085
    WHEN ist.item = '16oz Plastic Cups' THEN 0
    ELSE 0
  END,
  ist.id
FROM recipes r, inventory_stock ist
WHERE r.name = 'Matcha Blended' AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.item IN ('Matcha Powder', 'Milk', '16oz Plastic Cups')
  AND ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Oreo Strawberry
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT r.id, ist.item,
  CASE 
    WHEN ist.item = 'Oreo Cookie' THEN 3
    WHEN ist.item = 'Strawberry Syrup' THEN 20
    ELSE 1
  END,
  ist.unit::inventory_unit,
  CASE 
    WHEN ist.item = 'Oreo Cookie' THEN 2.96
    WHEN ist.item = 'Strawberry Syrup' THEN 0.45
    ELSE 0
  END,
  ist.id
FROM recipes r, inventory_stock ist
WHERE r.name = 'Oreo Strawberry' AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.item IN ('Oreo Cookie', 'Strawberry Syrup')
  AND ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Strawberry Kiss
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT r.id, 'Strawberry Jam', 1, 'Scoop'::inventory_unit, 0, ist.id
FROM recipes r, inventory_stock ist
WHERE r.name = 'Strawberry Kiss' AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.item = 'Strawberry Jam' AND ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Strawberry Latte
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT r.id, ist.item,
  CASE 
    WHEN ist.item = 'Coffee Beans' THEN 20
    WHEN ist.item = 'Milk' THEN 150
    WHEN ist.item = 'Strawberry Syrup' THEN 15
    WHEN ist.item = '12oz Hot Cups' THEN 1
    ELSE 1
  END,
  ist.unit::inventory_unit,
  CASE 
    WHEN ist.item = 'Coffee Beans' THEN 1.04
    WHEN ist.item = 'Milk' THEN 0.085
    WHEN ist.item = 'Strawberry Syrup' THEN 0.45
    WHEN ist.item = '12oz Hot Cups' THEN 0
    ELSE 0
  END,
  ist.id
FROM recipes r, inventory_stock ist
WHERE r.name = 'Strawberry Latte' AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.item IN ('Coffee Beans', 'Milk', 'Strawberry Syrup', '12oz Hot Cups')
  AND ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Vanilla Caramel
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT r.id, ist.item,
  CASE 
    WHEN ist.item = 'Vanilla Syrup' THEN 15
    WHEN ist.item = 'Caramel ' THEN 1
    ELSE 1
  END,
  ist.unit::inventory_unit,
  CASE 
    WHEN ist.item = 'Vanilla Syrup' THEN 0.45
    WHEN ist.item = 'Caramel ' THEN 0
    ELSE 0
  END,
  ist.id
FROM recipes r, inventory_stock ist
WHERE r.name = 'Vanilla Caramel' AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.item IN ('Vanilla Syrup', 'Caramel ')
  AND ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Update recipe costs based on ingredients
UPDATE recipes SET
  total_cost = (
    SELECT COALESCE(SUM(quantity * cost_per_unit), 0)
    FROM recipe_ingredients
    WHERE recipe_id = recipes.id
  ),
  cost_per_serving = (
    SELECT COALESCE(SUM(quantity * cost_per_unit), 0) / GREATEST(serving_size, 1)
    FROM recipe_ingredients
    WHERE recipe_id = recipes.id
  ),
  updated_at = NOW()
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND name IN (
    'Biscoff Biscuit', 'Caramel Latte (Hot)', 'Caramel Latte (Iced)', 'Caramel Sauce',
    'Chocolate Crumbs', 'Cookies & Cream Croffle', 'Graham Crushed', 'Iced Tea',
    'Lemonade', 'Matcha Blended', 'Oreo Strawberry', 'Strawberry Kiss',
    'Strawberry Latte', 'Vanilla Caramel'
  );