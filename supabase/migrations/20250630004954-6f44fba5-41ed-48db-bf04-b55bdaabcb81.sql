
-- Update RLS policies to allow admins and owners to see all purchase orders

-- Drop existing policies
DROP POLICY IF EXISTS "Managers can view purchase orders for their stores" ON public.purchase_orders;
DROP POLICY IF EXISTS "Managers can create purchase orders for their stores" ON public.purchase_orders;
DROP POLICY IF EXISTS "Managers can update purchase orders for their stores" ON public.purchase_orders;

-- Create new policies with proper admin access
CREATE POLICY "Users can view purchase orders based on role"
ON public.purchase_orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid() 
    AND au.is_active = true
    AND (
      -- Admins and owners can see all orders
      au.role IN ('admin', 'owner') 
      OR 
      -- Managers can see orders for their stores
      (au.role = 'manager' AND store_id = ANY(au.store_ids))
    )
  )
);

-- Create policy for creating purchase orders
CREATE POLICY "Users can create purchase orders based on role"
ON public.purchase_orders
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid() 
    AND au.role IN ('manager', 'admin', 'owner')
    AND (au.role IN ('admin', 'owner') OR store_id = ANY(au.store_ids))
    AND au.is_active = true
  )
);

-- Create policy for updating purchase orders
CREATE POLICY "Users can update purchase orders based on role"
ON public.purchase_orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid() 
    AND au.is_active = true
    AND (
      -- Admins and owners can update all orders
      au.role IN ('admin', 'owner') 
      OR 
      -- Managers can update orders for their stores
      (au.role = 'manager' AND store_id = ANY(au.store_ids))
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid() 
    AND au.role IN ('manager', 'admin', 'owner')
    AND (au.role IN ('admin', 'owner') OR store_id = ANY(au.store_ids))
    AND au.is_active = true
  )
);

-- Update purchase_order_items policies similarly
DROP POLICY IF EXISTS "Managers can view purchase order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Managers can create purchase order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Managers can update purchase order items" ON public.purchase_order_items;

-- Create new policies for purchase_order_items with proper admin access
CREATE POLICY "Users can view purchase order items based on role"
ON public.purchase_order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    JOIN public.app_users au ON au.user_id = auth.uid()
    WHERE po.id = purchase_order_id
    AND au.is_active = true
    AND (
      -- Admins and owners can see all order items
      au.role IN ('admin', 'owner')
      OR
      -- Managers can see items for orders in their stores
      (au.role = 'manager' AND po.store_id = ANY(au.store_ids))
    )
  )
);

-- Create policy for creating purchase order items
CREATE POLICY "Users can create purchase order items based on role"
ON public.purchase_order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    JOIN public.app_users au ON au.user_id = auth.uid()
    WHERE po.id = purchase_order_id
    AND au.role IN ('manager', 'admin', 'owner')
    AND (au.role IN ('admin', 'owner') OR po.store_id = ANY(au.store_ids))
    AND au.is_active = true
  )
);

-- Create policy for updating purchase order items
CREATE POLICY "Users can update purchase order items based on role"
ON public.purchase_order_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    JOIN public.app_users au ON au.user_id = auth.uid()
    WHERE po.id = purchase_order_id
    AND au.is_active = true
    AND (
      -- Admins and owners can update all order items
      au.role IN ('admin', 'owner')
      OR
      -- Managers can update items for orders in their stores
      (au.role = 'manager' AND po.store_id = ANY(au.store_ids))
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    JOIN public.app_users au ON au.user_id = auth.uid()
    WHERE po.id = purchase_order_id
    AND au.role IN ('manager', 'admin', 'owner')
    AND (au.role IN ('admin', 'owner') OR po.store_id = ANY(au.store_ids))
    AND au.is_active = true
  )
);
