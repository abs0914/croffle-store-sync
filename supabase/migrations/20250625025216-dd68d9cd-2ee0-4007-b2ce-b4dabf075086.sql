
-- Phase 1: Critical Security Fixes - RLS Policy Implementation (Corrected for existing policies)

-- Fix 1: Enable RLS and create policies for delivery_orders
ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view delivery orders for their stores" ON public.delivery_orders;
CREATE POLICY "Users can view delivery orders for their stores" 
ON public.delivery_orders FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    JOIN public.app_users au ON (
      au.user_id = auth.uid() 
      AND (au.role IN ('admin', 'owner') OR po.store_id = ANY(au.store_ids))
    )
    WHERE po.id = delivery_orders.purchase_order_id
  )
);

DROP POLICY IF EXISTS "Managers and above can manage delivery orders in their stores" ON public.delivery_orders;
CREATE POLICY "Managers and above can manage delivery orders in their stores" 
ON public.delivery_orders FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    JOIN public.app_users au ON (
      au.user_id = auth.uid() 
      AND (au.role IN ('admin', 'owner') OR (au.role = 'manager' AND po.store_id = ANY(au.store_ids)))
    )
    WHERE po.id = delivery_orders.purchase_order_id
  )
);

-- Fix 2: Enable RLS and create policies for goods_received_notes
ALTER TABLE public.goods_received_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view GRNs for their stores" ON public.goods_received_notes;
CREATE POLICY "Users can view GRNs for their stores" 
ON public.goods_received_notes FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.delivery_orders delivery_ord
    JOIN public.purchase_orders po ON delivery_ord.purchase_order_id = po.id
    JOIN public.app_users au ON (
      au.user_id = auth.uid() 
      AND (au.role IN ('admin', 'owner') OR po.store_id = ANY(au.store_ids))
    )
    WHERE delivery_ord.id = goods_received_notes.delivery_order_id
  )
);

DROP POLICY IF EXISTS "Managers and above can manage GRNs in their stores" ON public.goods_received_notes;
CREATE POLICY "Managers and above can manage GRNs in their stores" 
ON public.goods_received_notes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.delivery_orders delivery_ord
    JOIN public.purchase_orders po ON delivery_ord.purchase_order_id = po.id
    JOIN public.app_users au ON (
      au.user_id = auth.uid() 
      AND (au.role IN ('admin', 'owner') OR (au.role = 'manager' AND po.store_id = ANY(au.store_ids)))
    )
    WHERE delivery_ord.id = goods_received_notes.delivery_order_id
  )
);

-- Fix 3: Enable RLS and create policies for grn_items
ALTER TABLE public.grn_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view GRN items for their stores" ON public.grn_items;
CREATE POLICY "Users can view GRN items for their stores" 
ON public.grn_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.goods_received_notes grn
    JOIN public.delivery_orders delivery_ord ON grn.delivery_order_id = delivery_ord.id
    JOIN public.purchase_orders po ON delivery_ord.purchase_order_id = po.id
    JOIN public.app_users au ON (
      au.user_id = auth.uid() 
      AND (au.role IN ('admin', 'owner') OR po.store_id = ANY(au.store_ids))
    )
    WHERE grn.id = grn_items.grn_id
  )
);

DROP POLICY IF EXISTS "Managers and above can manage GRN items in their stores" ON public.grn_items;
CREATE POLICY "Managers and above can manage GRN items in their stores" 
ON public.grn_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.goods_received_notes grn
    JOIN public.delivery_orders delivery_ord ON grn.delivery_order_id = delivery_ord.id
    JOIN public.purchase_orders po ON delivery_ord.purchase_order_id = po.id
    JOIN public.app_users au ON (
      au.user_id = auth.uid() 
      AND (au.role IN ('admin', 'owner') OR (au.role = 'manager' AND po.store_id = ANY(au.store_ids)))
    )
    WHERE grn.id = grn_items.grn_id
  )
);

-- Fix 4: Enable RLS and create policies for purchase_order_items
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view purchase order items for their stores" ON public.purchase_order_items;
CREATE POLICY "Users can view purchase order items for their stores" 
ON public.purchase_order_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    JOIN public.app_users au ON (
      au.user_id = auth.uid() 
      AND (au.role IN ('admin', 'owner') OR po.store_id = ANY(au.store_ids))
    )
    WHERE po.id = purchase_order_items.purchase_order_id
  )
);

DROP POLICY IF EXISTS "Managers and above can manage purchase order items in their stores" ON public.purchase_order_items;
CREATE POLICY "Managers and above can manage purchase order items in their stores" 
ON public.purchase_order_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    JOIN public.app_users au ON (
      au.user_id = auth.uid() 
      AND (au.role IN ('admin', 'owner') OR (au.role = 'manager' AND po.store_id = ANY(au.store_ids)))
    )
    WHERE po.id = purchase_order_items.purchase_order_id
  )
);

-- Fix 5: Enable RLS and create policies for purchase_orders
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view purchase orders for their stores" ON public.purchase_orders;
CREATE POLICY "Users can view purchase orders for their stores" 
ON public.purchase_orders FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() 
    AND (
      au.role IN ('admin', 'owner') 
      OR purchase_orders.store_id = ANY(au.store_ids)
    )
  )
);

DROP POLICY IF EXISTS "Managers and above can manage purchase orders in their stores" ON public.purchase_orders;
CREATE POLICY "Managers and above can manage purchase orders in their stores" 
ON public.purchase_orders FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() 
    AND (
      au.role IN ('admin', 'owner') 
      OR (au.role = 'manager' AND purchase_orders.store_id = ANY(au.store_ids))
    )
  )
);

-- Fix 6: Enable RLS and create policies for order_audit_trail
ALTER TABLE public.order_audit_trail ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and owners can view all order audit trails" ON public.order_audit_trail;
CREATE POLICY "Admins and owners can view all order audit trails" 
ON public.order_audit_trail FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() 
    AND au.role IN ('admin', 'owner')
  )
);

DROP POLICY IF EXISTS "System can insert order audit trails" ON public.order_audit_trail;
CREATE POLICY "System can insert order audit trails" 
ON public.order_audit_trail FOR INSERT 
WITH CHECK (true);

-- Fix 7: Remove old policies and create new ones for stores table
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.stores;
DROP POLICY IF EXISTS "Admins and owners can manage stores" ON public.stores;
DROP POLICY IF EXISTS "Users can view stores they have access to" ON public.stores;

CREATE POLICY "Users can view stores they have access to" 
ON public.stores FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() 
    AND (
      au.role IN ('admin', 'owner') 
      OR stores.id = ANY(au.store_ids)
    )
  )
);

DROP POLICY IF EXISTS "Admins and owners can manage all stores" ON public.stores;
CREATE POLICY "Admins and owners can manage all stores" 
ON public.stores FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() 
    AND au.role IN ('admin', 'owner')
  )
);

-- Fix 8: Improve inventory_stock table RLS policies
ALTER TABLE public.inventory_stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view inventory stock from their stores" ON public.inventory_stock;
CREATE POLICY "Users can view inventory stock from their stores" 
ON public.inventory_stock FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() 
    AND (
      au.role IN ('admin', 'owner') 
      OR inventory_stock.store_id = ANY(au.store_ids)
    )
  )
);

DROP POLICY IF EXISTS "Managers and above can manage inventory stock in their stores" ON public.inventory_stock;
CREATE POLICY "Managers and above can manage inventory stock in their stores" 
ON public.inventory_stock FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() 
    AND (
      au.role IN ('admin', 'owner') 
      OR (au.role = 'manager' AND inventory_stock.store_id = ANY(au.store_ids))
    )
  )
);

-- Fix 9: Remove hardcoded email bypasses from app_users policies
DROP POLICY IF EXISTS "Admins can insert users" ON public.app_users;
DROP POLICY IF EXISTS "Admins can update users" ON public.app_users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.app_users;
DROP POLICY IF EXISTS "Admins and owners can insert users" ON public.app_users;
DROP POLICY IF EXISTS "Admins and owners can update users" ON public.app_users;
DROP POLICY IF EXISTS "Admins and owners can delete users" ON public.app_users;

CREATE POLICY "Admins and owners can insert users" 
ON public.app_users FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() 
    AND au.role IN ('admin', 'owner')
  )
);

CREATE POLICY "Admins and owners can update users" 
ON public.app_users FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() 
    AND au.role IN ('admin', 'owner')
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() 
    AND au.role IN ('admin', 'owner')
  )
);

CREATE POLICY "Admins and owners can delete users" 
ON public.app_users FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() 
    AND au.role IN ('admin', 'owner')
  )
);
