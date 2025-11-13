-- Drop the existing SELECT policy for purchase_order_items
DROP POLICY IF EXISTS "Authorized users can view purchase order items" ON public.purchase_order_items;

-- Recreate the SELECT policy with proper scoping
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