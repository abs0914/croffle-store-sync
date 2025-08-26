-- Fix database permission issues - Part 2
-- Drop existing functions first to avoid conflicts

-- Drop existing function with different signature
DROP FUNCTION IF EXISTS public.user_has_store_access(uuid,uuid);

-- Now create the comprehensive permission fix
CREATE OR REPLACE FUNCTION public.is_current_user_admin_or_owner()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM app_users 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner') 
    AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.user_has_store_access(p_user_id uuid, p_store_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM app_users 
    WHERE user_id = p_user_id 
    AND (
      role IN ('admin', 'owner') OR 
      p_store_id = ANY(store_ids)
    )
    AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_store_accessible(p_store_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
BEGIN
  RETURN user_has_store_access(auth.uid(), p_store_id);
END;
$$;

-- Fix RLS policies to use the new standardized functions

-- Fix customers table policies
DROP POLICY IF EXISTS "Admin, Owner and Manager can delete customers" ON customers;
DROP POLICY IF EXISTS "Admin, Owner and Manager can manage customers" ON customers;
DROP POLICY IF EXISTS "Users can insert customers for stores they have access to" ON customers;

CREATE POLICY "Users can manage customers in accessible stores" ON customers
FOR ALL USING (user_has_store_access(auth.uid(), store_id))
WITH CHECK (user_has_store_access(auth.uid(), store_id));

-- Fix inventory_stock policies
DROP POLICY IF EXISTS "Users can view inventory for their stores" ON inventory_stock;
DROP POLICY IF EXISTS "Users can manage inventory for their stores" ON inventory_stock;

CREATE POLICY "Users can view inventory for accessible stores" ON inventory_stock
FOR SELECT USING (user_has_store_access(auth.uid(), store_id));

CREATE POLICY "Users can manage inventory for accessible stores" ON inventory_stock
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM app_users 
    WHERE user_id = auth.uid() 
    AND (
      role IN ('admin', 'owner') OR 
      (role IN ('manager', 'stock_user') AND store_id = ANY(store_ids))
    )
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM app_users 
    WHERE user_id = auth.uid() 
    AND (
      role IN ('admin', 'owner') OR 
      (role IN ('manager', 'stock_user') AND store_id = ANY(store_ids))
    )
    AND is_active = true
  )
);

-- Fix transaction_items policies
DROP POLICY IF EXISTS "Users can view transaction items for their stores" ON transaction_items;
DROP POLICY IF EXISTS "Users can insert transaction items for their stores" ON transaction_items;
DROP POLICY IF EXISTS "Users can update transaction items for their stores" ON transaction_items;

CREATE POLICY "Users can manage transaction items for accessible stores" ON transaction_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM transactions t
    JOIN app_users au ON au.user_id = auth.uid()
    WHERE t.id = transaction_items.transaction_id
    AND (
      au.role IN ('admin', 'owner') OR 
      t.store_id = ANY(au.store_ids)
    )
    AND au.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM transactions t
    JOIN app_users au ON au.user_id = auth.uid()
    WHERE t.id = transaction_items.transaction_id
    AND (
      au.role IN ('admin', 'owner') OR 
      t.store_id = ANY(au.store_ids)
    )
    AND au.is_active = true
  )
);

-- Fix critical functions that may be causing permission errors
CREATE OR REPLACE FUNCTION public.update_inventory_on_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  item_record RECORD;
  inventory_item RECORD;
BEGIN
  -- Only process completed transactions
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Process each transaction item
    FOR item_record IN 
      SELECT ti.product_id, ti.quantity, ti.transaction_id, p.name as product_name
      FROM transaction_items ti
      JOIN products p ON ti.product_id = p.id
      WHERE ti.transaction_id = NEW.id
    LOOP
      -- Find corresponding inventory item
      SELECT * INTO inventory_item
      FROM inventory_stock ist
      WHERE ist.store_id = NEW.store_id
      AND LOWER(TRIM(ist.item)) = LOWER(TRIM(item_record.product_name))
      AND ist.is_active = true
      LIMIT 1;
      
      -- Update inventory if item exists
      IF inventory_item.id IS NOT NULL THEN
        UPDATE inventory_stock 
        SET 
          current_stock = GREATEST(0, current_stock - item_record.quantity),
          updated_at = NOW()
        WHERE id = inventory_item.id;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Test the fixes by running a comprehensive validation
CREATE OR REPLACE FUNCTION public.validate_system_permissions()
RETURNS TABLE(
  check_name text,
  status text,
  details text,
  store_affected uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check 1: Verify all auth users have app_users records
  RETURN QUERY
  SELECT 
    'Missing app_users records'::text,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::text,
    'Auth users without app_users: ' || COUNT(*)::text,
    NULL::uuid
  FROM auth.users u
  LEFT JOIN app_users au ON u.id = au.user_id
  WHERE au.user_id IS NULL AND u.email IS NOT NULL;
  
  -- Check 2: Verify store access for problematic store
  RETURN QUERY
  SELECT 
    'Store access for Sugbo Mercado'::text,
    CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END::text,
    'Users with access: ' || COUNT(*)::text,
    'd7c47e6b-f20a-4543-a6bd-000398f72df5'::uuid
  FROM app_users
  WHERE 'd7c47e6b-f20a-4543-a6bd-000398f72df5'::uuid = ANY(store_ids)
  AND is_active = true;
  
  -- Check 3: Verify inventory sync functionality
  RETURN QUERY
  SELECT 
    'Inventory sync readiness'::text,
    CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END::text,
    'Inventory items ready: ' || COUNT(*)::text,
    'd7c47e6b-f20a-4543-a6bd-000398f72df5'::uuid
  FROM inventory_stock
  WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'::uuid
  AND is_active = true;
  
  -- Check 4: Test if functions can access app_users without auth.users
  RETURN QUERY
  SELECT 
    'Function permission test'::text,
    CASE WHEN user_has_store_access('ad0a9b53-87ad-4e2f-b698-c8af68531521'::uuid, 'd7c47e6b-f20a-4543-a6bd-000398f72df5'::uuid) 
         THEN 'PASS' ELSE 'FAIL' END::text,
    'Test user store access function'::text,
    'd7c47e6b-f20a-4543-a6bd-000398f72df5'::uuid;
END;
$$;

-- Run the comprehensive validation
SELECT * FROM validate_system_permissions();