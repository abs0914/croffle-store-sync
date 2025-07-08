
-- First, add the new columns for fulfillment tracking
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS fulfilled_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS fulfilled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS delivery_scheduled_date date,
ADD COLUMN IF NOT EXISTS delivery_notes text;

-- Make supplier_id nullable since admin processes orders
ALTER TABLE purchase_orders 
ALTER COLUMN supplier_id DROP NOT NULL;

-- Add new enum values (must be done separately from their usage)
ALTER TYPE purchase_order_status ADD VALUE IF NOT EXISTS 'fulfilled';
ALTER TYPE purchase_order_status ADD VALUE IF NOT EXISTS 'delivered';

-- Commit the enum changes first
COMMIT;

-- Start new transaction and update existing purchase orders to new status values
BEGIN;
UPDATE purchase_orders 
SET status = CASE 
  WHEN status::text = 'draft' THEN 'pending'::purchase_order_status
  WHEN status::text = 'in_progress' THEN 'fulfilled'::purchase_order_status
  WHEN status::text = 'completed' THEN 'delivered'::purchase_order_status
  ELSE status
END
WHERE status::text IN ('draft', 'in_progress', 'completed');

-- Update RLS policies to reflect new workflow - ensure admins can fulfill orders
DROP POLICY IF EXISTS "Users can update purchase orders based on role" ON purchase_orders;

CREATE POLICY "Users can update purchase orders based on role"
ON purchase_orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.user_id = auth.uid() 
    AND au.is_active = true
    AND (
      -- Admins and owners can update all orders (for fulfillment)
      au.role IN ('admin', 'owner') 
      OR 
      -- Managers can update orders for their stores (for creation/GRN)
      (au.role = 'manager' AND store_id = ANY(au.store_ids))
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.user_id = auth.uid() 
    AND au.role IN ('manager', 'admin', 'owner')
    AND (au.role IN ('admin', 'owner') OR store_id = ANY(au.store_ids))
    AND au.is_active = true
  )
);

COMMIT;
