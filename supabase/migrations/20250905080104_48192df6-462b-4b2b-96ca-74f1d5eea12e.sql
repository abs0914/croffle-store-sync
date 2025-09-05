-- Fix inventory deduction for receipt 20250905-9153-145317
-- This is a Choco Marshmallow Croffle transaction that wasn't processed

-- Update inventory stock quantities (deduct 1 from each ingredient)
UPDATE inventory_stock 
SET stock_quantity = stock_quantity - 1,
    updated_at = NOW()
WHERE id IN (
  'b3f081db-fba9-42f6-b55e-c2f45d0bb500', -- Regular Croissant (49 -> 48)
  'd28400c7-c720-45a9-af5a-ed2fafa13be6', -- Whipped Cream (49 -> 48)
  'e6d95c34-14ff-42ed-92a4-3a2a8e21cf80', -- Chocolate Sauce (50 -> 49)
  '169f393b-2cae-46be-ae6c-e6b5c63d00de', -- Marshmallow (50 -> 49)
  '0100a06f-c4ae-45bc-af23-2fc8734fc5af', -- Chopstick (49 -> 48)
  'd5168fa5-05f5-4f6c-86d3-e1e7ac27dff3'  -- Wax Paper (49 -> 48)
);

-- Create inventory movement records for audit trail
INSERT INTO inventory_movements (
  inventory_stock_id,
  movement_type,
  quantity_change,
  previous_quantity,
  new_quantity,
  reference_type,
  reference_id,
  notes,
  created_by,
  created_at
) VALUES 
  ('b3f081db-fba9-42f6-b55e-c2f45d0bb500', 'sale', -1, 49, 48, 'transaction', '38c5c13f-f96f-437e-a614-5e9426bb5b45', 'Manual correction: Regular Croissant for Choco Marshmallow Croffle (Receipt: 20250905-9153-145317)', (SELECT user_id FROM app_users WHERE role = 'admin' LIMIT 1), NOW()),
  ('d28400c7-c720-45a9-af5a-ed2fafa13be6', 'sale', -1, 49, 48, 'transaction', '38c5c13f-f96f-437e-a614-5e9426bb5b45', 'Manual correction: Whipped Cream for Choco Marshmallow Croffle (Receipt: 20250905-9153-145317)', (SELECT user_id FROM app_users WHERE role = 'admin' LIMIT 1), NOW()),
  ('e6d95c34-14ff-42ed-92a4-3a2a8e21cf80', 'sale', -1, 50, 49, 'transaction', '38c5c13f-f96f-437e-a614-5e9426bb5b45', 'Manual correction: Chocolate Sauce for Choco Marshmallow Croffle (Receipt: 20250905-9153-145317)', (SELECT user_id FROM app_users WHERE role = 'admin' LIMIT 1), NOW()),
  ('169f393b-2cae-46be-ae6c-e6b5c63d00de', 'sale', -1, 50, 49, 'transaction', '38c5c13f-f96f-437e-a614-5e9426bb5b45', 'Manual correction: Marshmallow for Choco Marshmallow Croffle (Receipt: 20250905-9153-145317)', (SELECT user_id FROM app_users WHERE role = 'admin' LIMIT 1), NOW()),
  ('0100a06f-c4ae-45bc-af23-2fc8734fc5af', 'sale', -1, 49, 48, 'transaction', '38c5c13f-f96f-437e-a614-5e9426bb5b45', 'Manual correction: Chopstick for Choco Marshmallow Croffle (Receipt: 20250905-9153-145317)', (SELECT user_id FROM app_users WHERE role = 'admin' LIMIT 1), NOW()),
  ('d5168fa5-05f5-4f6c-86d3-e1e7ac27dff3', 'sale', -1, 49, 48, 'transaction', '38c5c13f-f96f-437e-a614-5e9426bb5b45', 'Manual correction: Wax Paper for Choco Marshmallow Croffle (Receipt: 20250905-9153-145317)', (SELECT user_id FROM app_users WHERE role = 'admin' LIMIT 1), NOW());