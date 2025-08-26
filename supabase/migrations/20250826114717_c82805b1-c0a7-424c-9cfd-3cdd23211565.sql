-- Phase 1: Update all inventory items to 100 units with proper audit trail
-- Update all inventory stock to 100 units
UPDATE inventory_stock 
SET 
  stock_quantity = 100,
  serving_ready_quantity = 100,
  updated_at = NOW()
WHERE is_active = true;

-- Create audit trail for inventory updates
INSERT INTO inventory_transactions (
  product_id,
  store_id,
  transaction_type,
  quantity,
  previous_quantity,
  new_quantity,
  created_by,
  notes,
  created_at
)
SELECT 
  ist.id,
  ist.store_id,
  'adjustment',
  100,
  0, -- previous quantity was 0
  100, -- new quantity is 100
  (SELECT user_id FROM app_users WHERE role = 'admin' LIMIT 1), -- Use admin user for system updates
  'Initial inventory stocking - 100 units per item',
  NOW()
FROM inventory_stock ist
WHERE ist.is_active = true;

-- Phase 2: Create recipe-ingredient mappings
-- This will link recipe ingredients to inventory items
SELECT create_ingredient_inventory_mappings();