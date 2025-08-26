-- Fix inventory sync issue: Remove wrong ingredient mappings and add correct ones

-- First, remove the incorrect ingredient mappings (Vanilla Ice Cream for croffles)
DELETE FROM product_ingredients 
WHERE product_catalog_id IN (
  '0d0d65bd-f7e4-415e-b6fb-39eb950d999f',  -- Tiramisu Croffle
  'ec3358f4-a29a-4237-b6d4-15e2450748d1',  -- Choco Marshmallow Croffle
  '0b459a46-c9ce-4893-9602-733d78681057'   -- Choco Nut Croffle
);

-- Correct the vanilla ice cream inventory (add back the wrongly deducted 3 units)
UPDATE inventory_stock 
SET stock_quantity = stock_quantity + 3,
    updated_at = NOW()
WHERE item = 'Vanilla Ice Cream' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

-- Get inventory items for proper mapping
WITH inventory_mapping AS (
  SELECT 
    'Regular Croissant' as recipe_ingredient,
    id as inventory_id,
    'REGULAR CROISSANT' as inventory_item
  FROM inventory_stock 
  WHERE item = 'REGULAR CROISSANT' 
    AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86'
    
  UNION ALL
  
  SELECT 'Chocolate Sauce', id, 'Caramel Sauce'
  FROM inventory_stock 
  WHERE item = 'Caramel Sauce' 
    AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86'
    
  UNION ALL
  
  SELECT 'Whipped Cream', id, 'Cream Cheese'
  FROM inventory_stock 
  WHERE item = 'Cream Cheese' 
    AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86'
    
  UNION ALL
  
  SELECT 'Chopstick', id, 'Popsicle stick'
  FROM inventory_stock 
  WHERE item = 'Popsicle stick' 
    AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86'
    
  UNION ALL
  
  SELECT 'Wax Paper', id, 'Wax paper'
  FROM inventory_stock 
  WHERE item = 'Wax paper' 
    AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86'
)

-- Add correct ingredient mappings for Tiramisu Croffle
INSERT INTO product_ingredients (
  product_catalog_id, 
  inventory_stock_id, 
  required_quantity, 
  unit,
  created_at
)
SELECT 
  '0d0d65bd-f7e4-415e-b6fb-39eb950d999f',
  inventory_id,
  1,
  'Serving',
  NOW()
FROM inventory_mapping 
WHERE recipe_ingredient IN ('Regular Croissant', 'Whipped Cream', 'Chopstick', 'Wax Paper');

-- Add correct ingredient mappings for Choco Marshmallow Croffle
INSERT INTO product_ingredients (
  product_catalog_id, 
  inventory_stock_id, 
  required_quantity, 
  unit,
  created_at
)
SELECT 
  'ec3358f4-a29a-4237-b6d4-15e2450748d1',
  inventory_id,
  1,
  'Serving',
  NOW()
FROM inventory_mapping 
WHERE recipe_ingredient IN ('Regular Croissant', 'Chocolate Sauce', 'Whipped Cream', 'Chopstick', 'Wax Paper');

-- Add correct ingredient mappings for Choco Nut Croffle  
INSERT INTO product_ingredients (
  product_catalog_id, 
  inventory_stock_id, 
  required_quantity, 
  unit,
  created_at
)
SELECT 
  '0b459a46-c9ce-4893-9602-733d78681057',
  inventory_id,
  1,
  'Serving',
  NOW()
FROM inventory_mapping 
WHERE recipe_ingredient IN ('Regular Croissant', 'Chocolate Sauce', 'Whipped Cream', 'Chopstick', 'Wax Paper');

-- Now apply correct inventory deductions for the transaction
-- Deduct Regular Croissant (3 units - already correctly deducted, so no change needed)
-- Deduct Chocolate Sauce for 2 croffles (Choco Marshmallow + Choco Nut)
UPDATE inventory_stock 
SET stock_quantity = stock_quantity - 2,
    updated_at = NOW()
WHERE item = 'Caramel Sauce' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

-- Deduct Whipped Cream for 3 croffles
UPDATE inventory_stock 
SET stock_quantity = stock_quantity - 3,
    updated_at = NOW()
WHERE item = 'Cream Cheese' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

-- Deduct Chopsticks for 3 croffles
UPDATE inventory_stock 
SET stock_quantity = stock_quantity - 3,
    updated_at = NOW()
WHERE item = 'Popsicle stick' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

-- Log the correction in inventory movements
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
  'correction',
  3,
  stock_quantity - 3,
  stock_quantity,
  'Inventory correction: Added back wrongly deducted Vanilla Ice Cream from transaction #20250820-6995-130907',
  (SELECT user_id FROM app_users WHERE role IN ('admin', 'owner') LIMIT 1),
  NOW()
FROM inventory_stock 
WHERE item = 'Vanilla Ice Cream' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';