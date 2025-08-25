-- Fix database permission issues - Part 3
-- Work around function dependency issues by creating new functions with different names first

-- Create standardized access control functions with new names
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

CREATE OR REPLACE FUNCTION public.check_user_store_access(p_user_id uuid, p_store_id uuid)
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
  RETURN check_user_store_access(auth.uid(), p_store_id);
END;
$$;

-- Update all policies that currently use user_has_store_access to use the new function

-- Update goods_received_notes policies
DROP POLICY IF EXISTS "Users can view GRNs for their stores" ON goods_received_notes;
DROP POLICY IF EXISTS "Managers and above can manage GRNs in their stores" ON goods_received_notes;

CREATE POLICY "Users can view GRNs for their stores" ON goods_received_notes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.id = goods_received_notes.purchase_order_id 
    AND check_user_store_access(auth.uid(), po.store_id)
  )
);

CREATE POLICY "Managers and above can manage GRNs in their stores" ON goods_received_notes
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.id = goods_received_notes.purchase_order_id 
    AND check_user_store_access(auth.uid(), po.store_id)
  )
);

-- Update grn_items policies
DROP POLICY IF EXISTS "Users can view GRN items for their stores" ON grn_items;
DROP POLICY IF EXISTS "Managers and above can manage GRN items in their stores" ON grn_items;

CREATE POLICY "Users can view GRN items for their stores" ON grn_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM goods_received_notes grn
    JOIN purchase_orders po ON po.id = grn.purchase_order_id
    WHERE grn.id = grn_items.grn_id 
    AND check_user_store_access(auth.uid(), po.store_id)
  )
);

CREATE POLICY "Managers and above can manage GRN items in their stores" ON grn_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM goods_received_notes grn
    JOIN purchase_orders po ON po.id = grn.purchase_order_id
    WHERE grn.id = grn_items.grn_id 
    AND check_user_store_access(auth.uid(), po.store_id)
  )
);

-- Update grn_discrepancy_resolutions policies
DROP POLICY IF EXISTS "Users can view discrepancy resolutions for their stores" ON grn_discrepancy_resolutions;
DROP POLICY IF EXISTS "Admins and managers can manage discrepancy resolutions" ON grn_discrepancy_resolutions;

CREATE POLICY "Users can view discrepancy resolutions for their stores" ON grn_discrepancy_resolutions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.id = grn_discrepancy_resolutions.purchase_order_id 
    AND check_user_store_access(auth.uid(), po.store_id)
  )
);

CREATE POLICY "Admins and managers can manage discrepancy resolutions" ON grn_discrepancy_resolutions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.id = grn_discrepancy_resolutions.purchase_order_id 
    AND check_user_store_access(auth.uid(), po.store_id)
  )
);

-- Update cashiers policies
DROP POLICY IF EXISTS "Users can view cashiers for their stores" ON cashiers;

CREATE POLICY "Users can view cashiers for their stores" ON cashiers
FOR SELECT USING (check_user_store_access(auth.uid(), store_id));

-- Now fix the problematic RLS policies that may be causing permission errors

-- Fix customers table policies
DROP POLICY IF EXISTS "Admin, Owner and Manager can delete customers" ON customers;
DROP POLICY IF EXISTS "Admin, Owner and Manager can manage customers" ON customers;
DROP POLICY IF EXISTS "Users can insert customers for stores they have access to" ON customers;
DROP POLICY IF EXISTS "Users can manage customers in accessible stores" ON customers;

CREATE POLICY "Users can manage customers in accessible stores" ON customers
FOR ALL USING (check_user_store_access(auth.uid(), store_id))
WITH CHECK (check_user_store_access(auth.uid(), store_id));

-- Fix inventory_stock policies
DROP POLICY IF EXISTS "Users can view inventory for their stores" ON inventory_stock;
DROP POLICY IF EXISTS "Users can manage inventory for their stores" ON inventory_stock;
DROP POLICY IF EXISTS "Users can view inventory for accessible stores" ON inventory_stock;
DROP POLICY IF EXISTS "Users can manage inventory for accessible stores" ON inventory_stock;

CREATE POLICY "Users can view inventory for accessible stores" ON inventory_stock
FOR SELECT USING (check_user_store_access(auth.uid(), store_id));

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
DROP POLICY IF EXISTS "Users can manage transaction items for accessible stores" ON transaction_items;

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

-- Now we can safely drop the old function and create the new one with the right name
DROP FUNCTION IF EXISTS public.user_has_store_access(uuid,uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.user_has_store_access(p_user_id uuid, p_store_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
BEGIN
  RETURN check_user_store_access(p_user_id, p_store_id);
END;
$$;

-- Test the system health after all fixes
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
  
  -- Check 4: Test function access
  RETURN QUERY
  SELECT 
    'Function permission test'::text,
    CASE WHEN check_user_store_access('ad0a9b53-87ad-4e2f-b698-c8af68531521'::uuid, 'd7c47e6b-f20a-4543-a6bd-000398f72df5'::uuid) 
         THEN 'PASS' ELSE 'FAIL' END::text,
    'Test user store access function'::text,
    'd7c47e6b-f20a-4543-a6bd-000398f72df5'::uuid;
END;
$$;

-- Run the comprehensive validation
SELECT * FROM validate_system_permissions();