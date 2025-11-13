-- Grant cashiers full order management access across all order-related tables

-- ============================================================================
-- PURCHASE ORDER ITEMS - Add UPDATE and DELETE policies for cashiers
-- ============================================================================

CREATE POLICY "Cashiers can update purchase order items for their stores"
ON public.purchase_order_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM app_users au
    JOIN purchase_orders po ON po.id = purchase_order_items.purchase_order_id
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.role = 'cashier'
      AND po.store_id = ANY(au.store_ids)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM app_users au
    JOIN purchase_orders po ON po.id = purchase_order_items.purchase_order_id
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.role = 'cashier'
      AND po.store_id = ANY(au.store_ids)
  )
);

CREATE POLICY "Cashiers can delete purchase order items for their stores"
ON public.purchase_order_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM app_users au
    JOIN purchase_orders po ON po.id = purchase_order_items.purchase_order_id
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.role = 'cashier'
      AND po.store_id = ANY(au.store_ids)
  )
);

-- ============================================================================
-- DELIVERY ORDERS - Add full CRUD policies for cashiers
-- ============================================================================

CREATE POLICY "Cashiers can view delivery orders for their stores"
ON public.delivery_orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM app_users au
    JOIN purchase_orders po ON po.id = delivery_orders.purchase_order_id
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.role = 'cashier'
      AND po.store_id = ANY(au.store_ids)
  )
);

CREATE POLICY "Cashiers can insert delivery orders for their stores"
ON public.delivery_orders
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM app_users au
    JOIN purchase_orders po ON po.id = delivery_orders.purchase_order_id
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.role = 'cashier'
      AND po.store_id = ANY(au.store_ids)
  )
);

CREATE POLICY "Cashiers can update delivery orders for their stores"
ON public.delivery_orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM app_users au
    JOIN purchase_orders po ON po.id = delivery_orders.purchase_order_id
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.role = 'cashier'
      AND po.store_id = ANY(au.store_ids)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM app_users au
    JOIN purchase_orders po ON po.id = delivery_orders.purchase_order_id
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.role = 'cashier'
      AND po.store_id = ANY(au.store_ids)
  )
);

CREATE POLICY "Cashiers can delete delivery orders for their stores"
ON public.delivery_orders
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM app_users au
    JOIN purchase_orders po ON po.id = delivery_orders.purchase_order_id
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.role = 'cashier'
      AND po.store_id = ANY(au.store_ids)
  )
);

-- ============================================================================
-- GOODS RECEIVED NOTES - Add full CRUD policies for cashiers
-- ============================================================================

CREATE POLICY "Cashiers can view GRNs for their stores"
ON public.goods_received_notes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM app_users au
    JOIN purchase_orders po ON po.id = goods_received_notes.purchase_order_id
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.role = 'cashier'
      AND po.store_id = ANY(au.store_ids)
  )
);

CREATE POLICY "Cashiers can insert GRNs for their stores"
ON public.goods_received_notes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM app_users au
    JOIN purchase_orders po ON po.id = goods_received_notes.purchase_order_id
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.role = 'cashier'
      AND po.store_id = ANY(au.store_ids)
  )
);

CREATE POLICY "Cashiers can update GRNs for their stores"
ON public.goods_received_notes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM app_users au
    JOIN purchase_orders po ON po.id = goods_received_notes.purchase_order_id
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.role = 'cashier'
      AND po.store_id = ANY(au.store_ids)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM app_users au
    JOIN purchase_orders po ON po.id = goods_received_notes.purchase_order_id
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.role = 'cashier'
      AND po.store_id = ANY(au.store_ids)
  )
);

CREATE POLICY "Cashiers can delete GRNs for their stores"
ON public.goods_received_notes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM app_users au
    JOIN purchase_orders po ON po.id = goods_received_notes.purchase_order_id
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.role = 'cashier'
      AND po.store_id = ANY(au.store_ids)
  )
);

-- ============================================================================
-- GRN ITEMS - Add full CRUD policies for cashiers
-- ============================================================================

CREATE POLICY "Cashiers can view GRN items for their stores"
ON public.grn_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM app_users au
    JOIN goods_received_notes grn ON grn.id = grn_items.grn_id
    JOIN purchase_orders po ON po.id = grn.purchase_order_id
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.role = 'cashier'
      AND po.store_id = ANY(au.store_ids)
  )
);

CREATE POLICY "Cashiers can insert GRN items for their stores"
ON public.grn_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM app_users au
    JOIN goods_received_notes grn ON grn.id = grn_items.grn_id
    JOIN purchase_orders po ON po.id = grn.purchase_order_id
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.role = 'cashier'
      AND po.store_id = ANY(au.store_ids)
  )
);

CREATE POLICY "Cashiers can update GRN items for their stores"
ON public.grn_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM app_users au
    JOIN goods_received_notes grn ON grn.id = grn_items.grn_id
    JOIN purchase_orders po ON po.id = grn.purchase_order_id
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.role = 'cashier'
      AND po.store_id = ANY(au.store_ids)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM app_users au
    JOIN goods_received_notes grn ON grn.id = grn_items.grn_id
    JOIN purchase_orders po ON po.id = grn.purchase_order_id
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.role = 'cashier'
      AND po.store_id = ANY(au.store_ids)
  )
);

CREATE POLICY "Cashiers can delete GRN items for their stores"
ON public.grn_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM app_users au
    JOIN goods_received_notes grn ON grn.id = grn_items.grn_id
    JOIN purchase_orders po ON po.id = grn.purchase_order_id
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.role = 'cashier'
      AND po.store_id = ANY(au.store_ids)
  )
);

-- ============================================================================
-- ORDER AUDIT TRAIL - Add SELECT policy for cashiers
-- ============================================================================

CREATE POLICY "Cashiers can view audit trail for their stores"
ON public.order_audit_trail
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM app_users au
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.role = 'cashier'
  )
);

-- ============================================================================
-- GRN DISCREPANCY RESOLUTIONS - Add full CRUD policies for cashiers
-- ============================================================================

CREATE POLICY "Cashiers can view discrepancy resolutions for their stores"
ON public.grn_discrepancy_resolutions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM app_users au
    JOIN purchase_orders po ON po.id = grn_discrepancy_resolutions.purchase_order_id
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.role = 'cashier'
      AND po.store_id = ANY(au.store_ids)
  )
);

CREATE POLICY "Cashiers can insert discrepancy resolutions for their stores"
ON public.grn_discrepancy_resolutions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM app_users au
    JOIN purchase_orders po ON po.id = grn_discrepancy_resolutions.purchase_order_id
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.role = 'cashier'
      AND po.store_id = ANY(au.store_ids)
  )
);

CREATE POLICY "Cashiers can update discrepancy resolutions for their stores"
ON public.grn_discrepancy_resolutions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM app_users au
    JOIN purchase_orders po ON po.id = grn_discrepancy_resolutions.purchase_order_id
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.role = 'cashier'
      AND po.store_id = ANY(au.store_ids)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM app_users au
    JOIN purchase_orders po ON po.id = grn_discrepancy_resolutions.purchase_order_id
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.role = 'cashier'
      AND po.store_id = ANY(au.store_ids)
  )
);

CREATE POLICY "Cashiers can delete discrepancy resolutions for their stores"
ON public.grn_discrepancy_resolutions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM app_users au
    JOIN purchase_orders po ON po.id = grn_discrepancy_resolutions.purchase_order_id
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.role = 'cashier'
      AND po.store_id = ANY(au.store_ids)
  )
);