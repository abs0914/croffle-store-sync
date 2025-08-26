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
  'restock'::transaction_type,
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

-- Phase 3: Create inventory sync audit table for better tracking
CREATE TABLE IF NOT EXISTS inventory_sync_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID,
  sync_status TEXT NOT NULL,
  error_details TEXT,
  items_processed INTEGER DEFAULT 0,
  sync_duration_ms INTEGER DEFAULT 0,
  affected_inventory_items JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_transaction_sync UNIQUE(transaction_id)
);

-- Enable RLS on inventory_sync_audit
ALTER TABLE inventory_sync_audit ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for inventory_sync_audit
CREATE POLICY "Admins can manage inventory sync audit" 
ON inventory_sync_audit 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.user_id = auth.uid() 
    AND au.role IN ('admin', 'owner')
  )
);

CREATE POLICY "System can insert inventory sync audit" 
ON inventory_sync_audit 
FOR INSERT 
WITH CHECK (true);