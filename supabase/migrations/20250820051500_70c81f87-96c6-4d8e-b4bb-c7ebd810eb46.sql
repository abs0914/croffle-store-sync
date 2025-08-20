-- Step 1: Remove incorrect ingredient mappings and correct Vanilla Ice Cream inventory

-- Remove the incorrect ingredient mappings (Vanilla Ice Cream for croffles)
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

-- Log the vanilla ice cream correction
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