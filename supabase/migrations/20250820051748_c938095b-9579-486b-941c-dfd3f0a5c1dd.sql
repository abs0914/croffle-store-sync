-- Step 3: Apply correct inventory deductions for the transaction

-- Deduct Caramel Sauce for 2 croffles (Choco Marshmallow + Choco Nut)
UPDATE inventory_stock 
SET stock_quantity = stock_quantity - 2,
    updated_at = NOW()
WHERE item = 'Caramel Sauce' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

-- Deduct Cream Cheese (Whipped Cream substitute) for 3 croffles
UPDATE inventory_stock 
SET stock_quantity = stock_quantity - 3,
    updated_at = NOW()
WHERE item = 'Cream Cheese' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

-- Deduct Popsicle sticks (Chopstick substitute) for 3 croffles
UPDATE inventory_stock 
SET stock_quantity = stock_quantity - 3,
    updated_at = NOW()
WHERE item = 'Popsicle stick' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

-- Log the correct ingredient deductions
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
  -2,
  stock_quantity + 2,
  stock_quantity,
  'Corrected deduction for transaction #20250820-6995-130907: Caramel Sauce for 2 chocolate croffles',
  (SELECT user_id FROM app_users WHERE role IN ('admin', 'owner') LIMIT 1),
  NOW()
FROM inventory_stock 
WHERE item = 'Caramel Sauce' 
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
  'Corrected deduction for transaction #20250820-6995-130907: Cream Cheese for 3 croffles',
  (SELECT user_id FROM app_users WHERE role IN ('admin', 'owner') LIMIT 1),
  NOW()
FROM inventory_stock 
WHERE item = 'Cream Cheese' 
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
  'Corrected deduction for transaction #20250820-6995-130907: Popsicle sticks for 3 croffles',
  (SELECT user_id FROM app_users WHERE role IN ('admin', 'owner') LIMIT 1),
  NOW()
FROM inventory_stock 
WHERE item = 'Popsicle stick' 
  AND store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';