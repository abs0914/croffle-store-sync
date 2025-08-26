-- Fix inventory sync issue for coffee products transaction #20250820-9679-131922

-- Step 1: Remove incorrect ingredient mappings for Cafe Latte (Hot) 
-- This product has 60 incorrect mappings - should only have coffee + creamer + lid
DELETE FROM product_ingredients 
WHERE product_catalog_id = 'ee57dcb4-6874-4c17-a485-814892a6e689';

-- Step 2: Add correct ingredient mappings for Cafe Latte (Hot)
-- Coffee
INSERT INTO product_ingredients (
  product_catalog_id, 
  inventory_stock_id, 
  required_quantity, 
  unit,
  created_at
)
SELECT 
  'ee57dcb4-6874-4c17-a485-814892a6e689',
  id,
  1,
  'Serving',
  NOW()
FROM inventory_stock 
WHERE item = 'Coffee' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

-- Creamer
INSERT INTO product_ingredients (
  product_catalog_id, 
  inventory_stock_id, 
  required_quantity, 
  unit,
  created_at
)
SELECT 
  'ee57dcb4-6874-4c17-a485-814892a6e689',
  id,
  1,
  'Serving',
  NOW()
FROM inventory_stock 
WHERE item = 'Creamer' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

-- Coffee Lid
INSERT INTO product_ingredients (
  product_catalog_id, 
  inventory_stock_id, 
  required_quantity, 
  unit,
  created_at
)
SELECT 
  'ee57dcb4-6874-4c17-a485-814892a6e689',
  id,
  1,
  'Serving',
  NOW()
FROM inventory_stock 
WHERE item = 'Coffee Lid' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

-- Step 3: Add ingredient mappings for Cafe Mocha (Hot) which has none
-- Coffee
INSERT INTO product_ingredients (
  product_catalog_id, 
  inventory_stock_id, 
  required_quantity, 
  unit,
  created_at
)
SELECT 
  '6a297fd0-816e-4fa6-b81c-aff63e491808',
  id,
  1,
  'Serving',
  NOW()
FROM inventory_stock 
WHERE item = 'Coffee' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

-- Chocolate Sauce for mocha
INSERT INTO product_ingredients (
  product_catalog_id, 
  inventory_stock_id, 
  required_quantity, 
  unit,
  created_at
)
SELECT 
  '6a297fd0-816e-4fa6-b81c-aff63e491808',
  id,
  1,
  'Serving',
  NOW()
FROM inventory_stock 
WHERE item = 'Chocolate Sauce' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

-- Creamer
INSERT INTO product_ingredients (
  product_catalog_id, 
  inventory_stock_id, 
  required_quantity, 
  unit,
  created_at
)
SELECT 
  '6a297fd0-816e-4fa6-b81c-aff63e491808',
  id,
  1,
  'Serving',
  NOW()  
FROM inventory_stock 
WHERE item = 'Creamer' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

-- Coffee Lid
INSERT INTO product_ingredients (
  product_catalog_id, 
  inventory_stock_id, 
  required_quantity, 
  unit,
  created_at
)
SELECT 
  '6a297fd0-816e-4fa6-b81c-aff63e491808',
  id,
  1,
  'Serving',
  NOW()
FROM inventory_stock 
WHERE item = 'Coffee Lid' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

-- Step 4: Apply missing inventory deductions for transaction #20250820-9679-131922
-- The transaction had: 1 Cafe Mocha + 1 Cappuccino + 1 Cafe Latte = 3 total coffee drinks

-- Deduct Coffee (3 servings)
UPDATE inventory_stock 
SET stock_quantity = stock_quantity - 3,
    updated_at = NOW()
WHERE item = 'Coffee' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

-- Deduct Creamer (3 servings)  
UPDATE inventory_stock 
SET stock_quantity = stock_quantity - 3,
    updated_at = NOW()
WHERE item = 'Creamer' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

-- Deduct Coffee Lids (3 pieces)
UPDATE inventory_stock 
SET stock_quantity = stock_quantity - 3,
    updated_at = NOW()
WHERE item = 'Coffee Lid' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

-- Deduct Chocolate Sauce (1 serving for the mocha)
UPDATE inventory_stock 
SET stock_quantity = stock_quantity - 1,
    updated_at = NOW()
WHERE item = 'Chocolate Sauce' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

-- Step 5: Log the corrected inventory movements
INSERT INTO inventory_movements (
  inventory_stock_id,
  movement_type,
  quantity_change,
  previous_quantity,
  new_quantity,
  notes,
  created_by,
  created_at
)
SELECT 
  id,
  'sale',
  -3,
  stock_quantity + 3,
  stock_quantity,
  'Corrected deduction for transaction #20250820-9679-131922: Coffee for 3 coffee drinks',
  (SELECT user_id FROM app_users WHERE role IN ('admin', 'owner') LIMIT 1),
  NOW()
FROM inventory_stock 
WHERE item = 'Coffee' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

INSERT INTO inventory_movements (
  inventory_stock_id,
  movement_type,
  quantity_change,
  previous_quantity,
  new_quantity,
  notes,
  created_by,
  created_at
)
SELECT 
  id,
  'sale',
  -3,
  stock_quantity + 3,
  stock_quantity,
  'Corrected deduction for transaction #20250820-9679-131922: Creamer for 3 coffee drinks',
  (SELECT user_id FROM app_users WHERE role IN ('admin', 'owner') LIMIT 1),
  NOW()
FROM inventory_stock 
WHERE item = 'Creamer' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

INSERT INTO inventory_movements (
  inventory_stock_id,
  movement_type,
  quantity_change,
  previous_quantity,
  new_quantity,
  notes,
  created_by,
  created_at
)
SELECT 
  id,
  'sale',
  -3,
  stock_quantity + 3,
  stock_quantity,
  'Corrected deduction for transaction #20250820-9679-131922: Coffee Lids for 3 coffee drinks',
  (SELECT user_id FROM app_users WHERE role IN ('admin', 'owner') LIMIT 1),
  NOW()
FROM inventory_stock 
WHERE item = 'Coffee Lid' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

INSERT INTO inventory_movements (
  inventory_stock_id,
  movement_type,
  quantity_change,
  previous_quantity,
  new_quantity,
  notes,
  created_by,
  created_at
)
SELECT 
  id,
  'sale',
  -1,
  stock_quantity + 1,
  stock_quantity,
  'Corrected deduction for transaction #20250820-9679-131922: Chocolate Sauce for 1 Cafe Mocha',
  (SELECT user_id FROM app_users WHERE role IN ('admin', 'owner') LIMIT 1),
  NOW()
FROM inventory_stock 
WHERE item = 'Chocolate Sauce' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';