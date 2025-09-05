-- Create a simple manual fix for the specific transaction
-- Manually deduct inventory for the Caramel Delight Croffle transaction

-- Update inventory stocks based on the recipe template ingredients (1 quantity each)
UPDATE inventory_stock 
SET stock_quantity = stock_quantity - 1,
    updated_at = NOW()
WHERE id IN (
  'b3f081db-fba9-42f6-b55e-c2f45d0bb500', -- Regular Croissant
  '4fd6762b-729f-4382-acef-64ac9b615f34', -- Caramel Sauce  
  'd28400c7-c720-45a9-af5a-ed2fafa13be6', -- Whipped Cream
  '54500856-7c31-49e8-92ba-85997e9321b3', -- Colored Sprinkles
  '0100a06f-c4ae-45bc-af23-2fc8734fc5af', -- Chopstick
  'd5168fa5-05f5-4f6c-86d3-e1e7ac27dff3'  -- Wax Paper
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
  created_at
) VALUES 
  ('b3f081db-fba9-42f6-b55e-c2f45d0bb500', 'sale', -1, 50, 49, 'transaction', '4c234d4c-f382-4cc8-b361-29a8002b0768', 'Manual correction: Regular Croissant for Caramel Delight Croffle', NOW()),
  ('4fd6762b-729f-4382-acef-64ac9b615f34', 'sale', -1, 50, 49, 'transaction', '4c234d4c-f382-4cc8-b361-29a8002b0768', 'Manual correction: Caramel Sauce for Caramel Delight Croffle', NOW()),
  ('d28400c7-c720-45a9-af5a-ed2fafa13be6', 'sale', -1, 50, 49, 'transaction', '4c234d4c-f382-4cc8-b361-29a8002b0768', 'Manual correction: Whipped Cream for Caramel Delight Croffle', NOW()),
  ('54500856-7c31-49e8-92ba-85997e9321b3', 'sale', -1, 50, 49, 'transaction', '4c234d4c-f382-4cc8-b361-29a8002b0768', 'Manual correction: Colored Sprinkles for Caramel Delight Croffle', NOW()),
  ('0100a06f-c4ae-45bc-af23-2fc8734fc5af', 'sale', -1, 50, 49, 'transaction', '4c234d4c-f382-4cc8-b361-29a8002b0768', 'Manual correction: Chopstick for Caramel Delight Croffle', NOW()),
  ('d5168fa5-05f5-4f6c-86d3-e1e7ac27dff3', 'sale', -1, 50, 49, 'transaction', '4c234d4c-f382-4cc8-b361-29a8002b0768', 'Manual correction: Wax Paper for Caramel Delight Croffle', NOW());