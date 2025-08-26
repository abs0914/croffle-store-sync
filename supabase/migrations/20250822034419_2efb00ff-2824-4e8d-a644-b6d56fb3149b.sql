-- Just add ingredients to recipes without touching product_catalog

-- Biscoff Biscuit ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT r.id, 'Biscoff', 1, 'pieces'::inventory_unit, 0, ist.id
FROM recipes r, inventory_stock ist
WHERE r.name = 'Biscoff Biscuit' AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.item = 'Biscoff' AND ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Caramel Latte (Hot) ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT r.id, ist.item, 
  CASE 
    WHEN ist.item = 'Coffee Beans' THEN 20
    WHEN ist.item = 'Milk' THEN 150
    WHEN ist.item = 'Caramel ' THEN 1
    WHEN ist.item = '12oz Hot Cups' THEN 1
  END,
  CASE 
    WHEN ist.item = 'Coffee Beans' THEN 'g'::inventory_unit
    WHEN ist.item = 'Milk' THEN 'ml'::inventory_unit
    WHEN ist.item = 'Caramel ' THEN 'pieces'::inventory_unit
    WHEN ist.item = '12oz Hot Cups' THEN 'pieces'::inventory_unit
  END,
  CASE 
    WHEN ist.item = 'Coffee Beans' THEN 1.04
    WHEN ist.item = 'Milk' THEN 0.085
    WHEN ist.item = 'Caramel ' THEN 0
    WHEN ist.item = '12oz Hot Cups' THEN 0
  END,
  ist.id
FROM recipes r, inventory_stock ist
WHERE r.name = 'Caramel Latte (Hot)' AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.item IN ('Coffee Beans', 'Milk', 'Caramel ', '12oz Hot Cups')
  AND ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Caramel Latte (Iced) ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT r.id, ist.item,
  CASE 
    WHEN ist.item = 'Coffee Beans' THEN 20
    WHEN ist.item = 'Milk' THEN 150
    WHEN ist.item = 'Caramel ' THEN 1
    WHEN ist.item = '16oz Plastic Cups' THEN 1
  END,
  CASE 
    WHEN ist.item = 'Coffee Beans' THEN 'g'::inventory_unit
    WHEN ist.item = 'Milk' THEN 'ml'::inventory_unit
    WHEN ist.item = 'Caramel ' THEN 'pieces'::inventory_unit
    WHEN ist.item = '16oz Plastic Cups' THEN 'pieces'::inventory_unit
  END,
  CASE 
    WHEN ist.item = 'Coffee Beans' THEN 1.04
    WHEN ist.item = 'Milk' THEN 0.085
    WHEN ist.item = 'Caramel ' THEN 0
    WHEN ist.item = '16oz Plastic Cups' THEN 0
  END,
  ist.id
FROM recipes r, inventory_stock ist
WHERE r.name = 'Caramel Latte (Iced)' AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.item IN ('Coffee Beans', 'Milk', 'Caramel ', '16oz Plastic Cups')
  AND ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Caramel Sauce ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT r.id, 'Caramel Sauce for Coffee', 1, 'pieces'::inventory_unit, 0, ist.id
FROM recipes r, inventory_stock ist
WHERE r.name = 'Caramel Sauce' AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.item = 'Caramel Sauce for Coffee' AND ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Chocolate Crumbs ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT r.id, 'Chocolate Crumble', 1, 'pieces'::inventory_unit, 0, ist.id
FROM recipes r, inventory_stock ist
WHERE r.name = 'Chocolate Crumbs' AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.item = 'Chocolate Crumble' AND ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Cookies & Cream Croffle ingredients  
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT r.id, ist.item,
  CASE 
    WHEN ist.item = 'Regular Croissant' THEN 1
    WHEN ist.item = 'Oreo Cookie' THEN 3
    WHEN ist.item = 'Crushed Oreo' THEN 10
  END,
  CASE 
    WHEN ist.item = 'Regular Croissant' THEN 'pieces'::inventory_unit
    WHEN ist.item = 'Oreo Cookie' THEN 'pieces'::inventory_unit
    WHEN ist.item = 'Crushed Oreo' THEN 'g'::inventory_unit
  END,
  CASE 
    WHEN ist.item = 'Regular Croissant' THEN 2100
    WHEN ist.item = 'Oreo Cookie' THEN 2.96
    WHEN ist.item = 'Crushed Oreo' THEN 2.5
  END,
  ist.id
FROM recipes r, inventory_stock ist
WHERE r.name = 'Cookies & Cream Croffle' AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.item IN ('Regular Croissant', 'Oreo Cookie', 'Crushed Oreo')
  AND ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Graham Crushed ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT r.id, 'Graham Crushed', 1, 'pieces'::inventory_unit, 0, ist.id
FROM recipes r, inventory_stock ist
WHERE r.name = 'Graham Crushed' AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.item = 'Graham Crushed' AND ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Iced Tea ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT r.id, ist.item,
  CASE 
    WHEN ist.item = 'Iced Tea Powder' THEN 30
    WHEN ist.item = '16oz Plastic Cups' THEN 1
  END,
  CASE 
    WHEN ist.item = 'Iced Tea Powder' THEN 'g'::inventory_unit
    WHEN ist.item = '16oz Plastic Cups' THEN 'pieces'::inventory_unit
  END,
  CASE 
    WHEN ist.item = 'Iced Tea Powder' THEN 90.00
    WHEN ist.item = '16oz Plastic Cups' THEN 0
  END,
  ist.id
FROM recipes r, inventory_stock ist
WHERE r.name = 'Iced Tea' AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.item IN ('Iced Tea Powder', '16oz Plastic Cups')
  AND ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Lemonade ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT r.id, ist.item,
  CASE 
    WHEN ist.item = 'Lemonade Powder (Cucumber)' THEN 30
    WHEN ist.item = '16oz Plastic Cups' THEN 1
  END,
  CASE 
    WHEN ist.item = 'Lemonade Powder (Cucumber)' THEN 'g'::inventory_unit
    WHEN ist.item = '16oz Plastic Cups' THEN 'pieces'::inventory_unit
  END,
  CASE 
    WHEN ist.item = 'Lemonade Powder (Cucumber)' THEN 80.00
    WHEN ist.item = '16oz Plastic Cups' THEN 0
  END,
  ist.id
FROM recipes r, inventory_stock ist
WHERE r.name = 'Lemonade' AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.item IN ('Lemonade Powder (Cucumber)', '16oz Plastic Cups')
  AND ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Matcha Blended ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT r.id, ist.item,
  CASE 
    WHEN ist.item = 'Matcha Powder' THEN 15
    WHEN ist.item = 'Milk' THEN 200
    WHEN ist.item = '16oz Plastic Cups' THEN 1
  END,
  CASE 
    WHEN ist.item = 'Matcha Powder' THEN 'g'::inventory_unit
    WHEN ist.item = 'Milk' THEN 'ml'::inventory_unit
    WHEN ist.item = '16oz Plastic Cups' THEN 'pieces'::inventory_unit
  END,
  CASE 
    WHEN ist.item = 'Matcha Powder' THEN 200.00
    WHEN ist.item = 'Milk' THEN 0.085
    WHEN ist.item = '16oz Plastic Cups' THEN 0
  END,
  ist.id
FROM recipes r, inventory_stock ist
WHERE r.name = 'Matcha Blended' AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.item IN ('Matcha Powder', 'Milk', '16oz Plastic Cups')
  AND ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Oreo Strawberry ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT r.id, ist.item,
  CASE 
    WHEN ist.item = 'Oreo Cookie' THEN 3
    WHEN ist.item = 'Strawberry Syrup' THEN 20
  END,
  CASE 
    WHEN ist.item = 'Oreo Cookie' THEN 'pieces'::inventory_unit
    WHEN ist.item = 'Strawberry Syrup' THEN 'ml'::inventory_unit
  END,
  CASE 
    WHEN ist.item = 'Oreo Cookie' THEN 2.96
    WHEN ist.item = 'Strawberry Syrup' THEN 0.45
  END,
  ist.id
FROM recipes r, inventory_stock ist
WHERE r.name = 'Oreo Strawberry' AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.item IN ('Oreo Cookie', 'Strawberry Syrup')
  AND ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Strawberry Kiss ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT r.id, 'Strawberry Jam', 1, 'pieces'::inventory_unit, 0, ist.id
FROM recipes r, inventory_stock ist
WHERE r.name = 'Strawberry Kiss' AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.item = 'Strawberry Jam' AND ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Strawberry Latte ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT r.id, ist.item,
  CASE 
    WHEN ist.item = 'Coffee Beans' THEN 20
    WHEN ist.item = 'Milk' THEN 150
    WHEN ist.item = 'Strawberry Syrup' THEN 15
    WHEN ist.item = '12oz Hot Cups' THEN 1
  END,
  CASE 
    WHEN ist.item = 'Coffee Beans' THEN 'g'::inventory_unit
    WHEN ist.item = 'Milk' THEN 'ml'::inventory_unit
    WHEN ist.item = 'Strawberry Syrup' THEN 'ml'::inventory_unit
    WHEN ist.item = '12oz Hot Cups' THEN 'pieces'::inventory_unit
  END,
  CASE 
    WHEN ist.item = 'Coffee Beans' THEN 1.04
    WHEN ist.item = 'Milk' THEN 0.085
    WHEN ist.item = 'Strawberry Syrup' THEN 0.45
    WHEN ist.item = '12oz Hot Cups' THEN 0
  END,
  ist.id
FROM recipes r, inventory_stock ist
WHERE r.name = 'Strawberry Latte' AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.item IN ('Coffee Beans', 'Milk', 'Strawberry Syrup', '12oz Hot Cups')
  AND ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Vanilla Caramel ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT r.id, ist.item,
  CASE 
    WHEN ist.item = 'Vanilla Syrup' THEN 15
    WHEN ist.item = 'Caramel ' THEN 1
  END,
  CASE 
    WHEN ist.item = 'Vanilla Syrup' THEN 'ml'::inventory_unit
    WHEN ist.item = 'Caramel ' THEN 'pieces'::inventory_unit
  END,
  CASE 
    WHEN ist.item = 'Vanilla Syrup' THEN 0.45
    WHEN ist.item = 'Caramel ' THEN 0
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