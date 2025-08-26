-- Step 2: Add correct ingredient mappings for croffle products

-- Add correct ingredient mappings for Tiramisu Croffle
-- Regular Croissant
INSERT INTO product_ingredients (
  product_catalog_id, 
  inventory_stock_id, 
  required_quantity, 
  unit,
  created_at
)
SELECT 
  '0d0d65bd-f7e4-415e-b6fb-39eb950d999f',
  id,
  1,
  'Pieces',
  NOW()
FROM inventory_stock 
WHERE item = 'REGULAR CROISSANT' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

-- Whipped Cream (using Cream Cheese as substitute)
INSERT INTO product_ingredients (
  product_catalog_id, 
  inventory_stock_id, 
  required_quantity, 
  unit,
  created_at
)
SELECT 
  '0d0d65bd-f7e4-415e-b6fb-39eb950d999f',
  id,
  1,
  'Serving',
  NOW()
FROM inventory_stock 
WHERE item = 'Cream Cheese' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

-- Chopstick (using Popsicle stick as substitute)
INSERT INTO product_ingredients (
  product_catalog_id, 
  inventory_stock_id, 
  required_quantity, 
  unit,
  created_at
)
SELECT 
  '0d0d65bd-f7e4-415e-b6fb-39eb950d999f',
  id,
  1,
  'Pieces',
  NOW()
FROM inventory_stock 
WHERE item = 'Popsicle stick' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

-- Add correct ingredient mappings for Choco Marshmallow Croffle
-- Regular Croissant
INSERT INTO product_ingredients (
  product_catalog_id, 
  inventory_stock_id, 
  required_quantity, 
  unit,
  created_at
)
SELECT 
  'ec3358f4-a29a-4237-b6d4-15e2450748d1',
  id,
  1,
  'Pieces',
  NOW()
FROM inventory_stock 
WHERE item = 'REGULAR CROISSANT' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

-- Chocolate Sauce (using Caramel Sauce as substitute)
INSERT INTO product_ingredients (
  product_catalog_id, 
  inventory_stock_id, 
  required_quantity, 
  unit,
  created_at
)
SELECT 
  'ec3358f4-a29a-4237-b6d4-15e2450748d1',
  id,
  1,
  'Serving',
  NOW()
FROM inventory_stock 
WHERE item = 'Caramel Sauce' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

-- Whipped Cream (using Cream Cheese as substitute)
INSERT INTO product_ingredients (
  product_catalog_id, 
  inventory_stock_id, 
  required_quantity, 
  unit,
  created_at
)
SELECT 
  'ec3358f4-a29a-4237-b6d4-15e2450748d1',
  id,
  1,
  'Serving',
  NOW()
FROM inventory_stock 
WHERE item = 'Cream Cheese' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

-- Chopstick (using Popsicle stick as substitute)
INSERT INTO product_ingredients (
  product_catalog_id, 
  inventory_stock_id, 
  required_quantity, 
  unit,
  created_at
)
SELECT 
  'ec3358f4-a29a-4237-b6d4-15e2450748d1',
  id,
  1,
  'Pieces',
  NOW()
FROM inventory_stock 
WHERE item = 'Popsicle stick' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

-- Add correct ingredient mappings for Choco Nut Croffle
-- Regular Croissant
INSERT INTO product_ingredients (
  product_catalog_id, 
  inventory_stock_id, 
  required_quantity, 
  unit,
  created_at
)
SELECT 
  '0b459a46-c9ce-4893-9602-733d78681057',
  id,
  1,
  'Pieces',
  NOW()
FROM inventory_stock 
WHERE item = 'REGULAR CROISSANT' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

-- Chocolate Sauce (using Caramel Sauce as substitute)
INSERT INTO product_ingredients (
  product_catalog_id, 
  inventory_stock_id, 
  required_quantity, 
  unit,
  created_at
)
SELECT 
  '0b459a46-c9ce-4893-9602-733d78681057',
  id,
  1,
  'Serving',
  NOW()
FROM inventory_stock 
WHERE item = 'Caramel Sauce' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

-- Whipped Cream (using Cream Cheese as substitute)
INSERT INTO product_ingredients (
  product_catalog_id, 
  inventory_stock_id, 
  required_quantity, 
  unit,
  created_at
)
SELECT 
  '0b459a46-c9ce-4893-9602-733d78681057',
  id,
  1,
  'Serving',
  NOW()
FROM inventory_stock 
WHERE item = 'Cream Cheese' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

-- Chopstick (using Popsicle stick as substitute)
INSERT INTO product_ingredients (
  product_catalog_id, 
  inventory_stock_id, 
  required_quantity, 
  unit,
  created_at
)
SELECT 
  '0b459a46-c9ce-4893-9602-733d78681057',
  id,
  1,
  'Pieces',
  NOW()
FROM inventory_stock 
WHERE item = 'Popsicle stick' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';