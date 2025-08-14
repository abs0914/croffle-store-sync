-- Add missing customer fields for compatibility
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS tin TEXT,
ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;

-- Add index for performance on frequently queried fields
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_store_id ON customers(store_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- Update RLS policies to ensure proper access for customer management
DROP POLICY IF EXISTS "Users can view customers for stores they have access to" ON customers;
DROP POLICY IF EXISTS "Users can view customers from their stores" ON customers;

-- Create a unified customer access policy
CREATE POLICY "Users can manage customers in accessible stores" 
ON customers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.user_id = auth.uid() 
    AND au.is_active = true
    AND (
      -- Admin/Owner can access all customers
      au.role IN ('admin', 'owner')
      OR 
      -- Manager/Cashier can access customers from their stores
      (au.role IN ('manager', 'cashier') AND customers.store_id = ANY(au.store_ids))
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.user_id = auth.uid() 
    AND au.is_active = true
    AND (
      -- Admin/Owner can manage all customers
      au.role IN ('admin', 'owner')
      OR 
      -- Manager/Cashier can manage customers from their stores
      (au.role IN ('manager', 'cashier') AND customers.store_id = ANY(au.store_ids))
    )
  )
);