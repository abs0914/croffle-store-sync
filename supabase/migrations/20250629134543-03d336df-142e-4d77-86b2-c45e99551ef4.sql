
-- First, let's check if RLS is enabled on purchase_orders and purchase_order_items tables
-- and create appropriate policies for managers

-- Enable RLS on purchase_orders table if not already enabled
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

-- Enable RLS on purchase_order_items table if not already enabled
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Create policy for purchase_orders - allow managers to create orders for their stores
CREATE POLICY "Managers can create purchase orders for their stores"
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

-- Create policy for purchase_orders - allow managers to view orders for their stores
CREATE POLICY "Managers can view purchase orders for their stores"
ON public.purchase_orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid() 
    AND au.role IN ('manager', 'admin', 'owner')
    AND (au.role IN ('admin', 'owner') OR store_id = ANY(au.store_ids))
    AND au.is_active = true
  )
);

-- Create policy for purchase_orders - allow managers to update orders for their stores
CREATE POLICY "Managers can update purchase orders for their stores"
ON public.purchase_orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid() 
    AND au.role IN ('manager', 'admin', 'owner')
    AND (au.role IN ('admin', 'owner') OR store_id = ANY(au.store_ids))
    AND au.is_active = true
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

-- Create policy for purchase_order_items - allow managers to create items for purchase orders they can access
CREATE POLICY "Managers can create purchase order items"
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

-- Create policy for purchase_order_items - allow managers to view items for purchase orders they can access
CREATE POLICY "Managers can view purchase order items"
ON public.purchase_order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    JOIN public.app_users au ON au.user_id = auth.uid()
    WHERE po.id = purchase_order_id
    AND au.role IN ('manager', 'admin', 'owner')
    AND (au.role IN ('admin', 'owner') OR po.store_id = ANY(au.store_ids))
    AND au.is_active = true
  )
);

-- Create policy for purchase_order_items - allow managers to update items for purchase orders they can access
CREATE POLICY "Managers can update purchase order items"
ON public.purchase_order_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    JOIN public.app_users au ON au.user_id = auth.uid()
    WHERE po.id = purchase_order_id
    AND au.role IN ('manager', 'admin', 'owner')
    AND (au.role IN ('admin', 'owner') OR po.store_id = ANY(au.store_ids))
    AND au.is_active = true
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
