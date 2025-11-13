-- Drop conflicting/redundant policies for inventory_stock
DROP POLICY IF EXISTS "Users can insert inventory stock" ON public.inventory_stock;
DROP POLICY IF EXISTS "Users can update inventory stock" ON public.inventory_stock;
DROP POLICY IF EXISTS "Users can delete inventory stock" ON public.inventory_stock;

-- Create clear policies for cashiers and stock users to manage inventory stock for their stores
CREATE POLICY "Cashiers and stock users can view inventory stock for their stores"
ON public.inventory_stock
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM app_users au
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.role IN ('cashier', 'stock_user')
      AND inventory_stock.store_id = ANY(au.store_ids)
  )
);

CREATE POLICY "Cashiers and stock users can insert inventory stock for their stores"
ON public.inventory_stock
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM app_users au
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.role IN ('cashier', 'stock_user')
      AND inventory_stock.store_id = ANY(au.store_ids)
  )
);

CREATE POLICY "Cashiers and stock users can update inventory stock for their stores"
ON public.inventory_stock
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM app_users au
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.role IN ('cashier', 'stock_user')
      AND inventory_stock.store_id = ANY(au.store_ids)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM app_users au
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.role IN ('cashier', 'stock_user')
      AND inventory_stock.store_id = ANY(au.store_ids)
  )
);