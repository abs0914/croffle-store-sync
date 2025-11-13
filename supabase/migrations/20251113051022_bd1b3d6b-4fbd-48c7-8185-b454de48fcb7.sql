-- Create RLS policies for purchase_orders table
-- Allow authorized users to insert purchase orders
CREATE POLICY "Authorized users can create purchase orders"
ON public.purchase_orders
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM app_users
    WHERE app_users.user_id = auth.uid()
      AND app_users.role IN ('admin', 'owner', 'manager', 'cashier', 'stock_user')
      AND app_users.is_active = true
  )
);

-- Allow authorized users to view purchase orders from their store or all stores (managers+)
CREATE POLICY "Authorized users can view purchase orders"
ON public.purchase_orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM app_users
    WHERE app_users.user_id = auth.uid()
      AND app_users.is_active = true
      AND (
        -- Admins, owners, and managers can see all purchase orders
        app_users.role IN ('admin', 'owner', 'manager')
        -- Cashiers and stock users can see orders from their stores
        OR (app_users.role IN ('cashier', 'stock_user') AND purchase_orders.store_id = ANY(app_users.store_ids))
      )
  )
);

-- Allow authorized users to update purchase orders
CREATE POLICY "Authorized users can update purchase orders"
ON public.purchase_orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM app_users
    WHERE app_users.user_id = auth.uid()
      AND app_users.role IN ('admin', 'owner', 'manager', 'cashier', 'stock_user')
      AND app_users.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM app_users
    WHERE app_users.user_id = auth.uid()
      AND app_users.role IN ('admin', 'owner', 'manager', 'cashier', 'stock_user')
      AND app_users.is_active = true
  )
);

-- Allow managers and above to delete purchase orders
CREATE POLICY "Managers and above can delete purchase orders"
ON public.purchase_orders
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM app_users
    WHERE app_users.user_id = auth.uid()
      AND app_users.role IN ('admin', 'owner', 'manager')
      AND app_users.is_active = true
  )
);

-- Create RLS policies for purchase_order_items table
-- Allow authorized users to insert purchase order items
CREATE POLICY "Authorized users can create purchase order items"
ON public.purchase_order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM app_users
    WHERE app_users.user_id = auth.uid()
      AND app_users.role IN ('admin', 'owner', 'manager', 'cashier', 'stock_user')
      AND app_users.is_active = true
  )
);

-- Allow authorized users to view purchase order items
CREATE POLICY "Authorized users can view purchase order items"
ON public.purchase_order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM app_users au
    LEFT JOIN purchase_orders po ON po.id = purchase_order_items.purchase_order_id
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND (
        -- Admins, owners, and managers can see all items
        au.role IN ('admin', 'owner', 'manager')
        -- Cashiers and stock users can see items from their stores' orders
        OR (au.role IN ('cashier', 'stock_user') AND po.store_id = ANY(au.store_ids))
      )
  )
);

-- Allow authorized users to update purchase order items
CREATE POLICY "Authorized users can update purchase order items"
ON public.purchase_order_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM app_users
    WHERE app_users.user_id = auth.uid()
      AND app_users.role IN ('admin', 'owner', 'manager', 'cashier', 'stock_user')
      AND app_users.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM app_users
    WHERE app_users.user_id = auth.uid()
      AND app_users.role IN ('admin', 'owner', 'manager', 'cashier', 'stock_user')
      AND app_users.is_active = true
  )
);

-- Allow managers and above to delete purchase order items
CREATE POLICY "Managers and above can delete purchase order items"
ON public.purchase_order_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM app_users
    WHERE app_users.user_id = auth.uid()
      AND app_users.role IN ('admin', 'owner', 'manager')
      AND app_users.is_active = true
  )
);