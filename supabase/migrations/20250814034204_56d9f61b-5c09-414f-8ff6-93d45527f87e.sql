-- CRITICAL SECURITY FIX: Protect Business Data from Unauthorized Access
-- This migration addresses the 3 critical data exposure vulnerabilities

-- 1. Secure the stores table - prevent competitors from accessing business information
DROP POLICY IF EXISTS "Enable read access for all users" ON public.stores;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.stores; 
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.stores;

-- Create comprehensive RLS policies for stores table
CREATE POLICY "Users can view accessible stores"
ON public.stores
FOR SELECT
USING (
  -- Admins and owners can see all stores
  is_admin_or_owner() OR 
  -- Users can only see stores they have access to
  is_store_accessible(id)
);

CREATE POLICY "Admins and owners can manage stores"
ON public.stores
FOR ALL
USING (is_admin_or_owner())
WITH CHECK (is_admin_or_owner());

-- 2. Secure the bir_cumulative_sales table - protect financial data
CREATE POLICY "Users can view sales data for accessible stores"
ON public.bir_cumulative_sales
FOR SELECT
USING (
  -- Admins and owners can see all sales data
  is_admin_or_owner() OR 
  -- Users can only see sales data for stores they have access to
  is_store_accessible(store_id)
);

CREATE POLICY "Admins and owners can manage cumulative sales"
ON public.bir_cumulative_sales
FOR ALL
USING (is_admin_or_owner())
WITH CHECK (is_admin_or_owner());

-- 3. Secure the store_metrics table - protect business intelligence
CREATE POLICY "Users can view metrics for accessible stores"
ON public.store_metrics
FOR SELECT
USING (
  -- Admins and owners can see all metrics
  is_admin_or_owner() OR 
  -- Users can only see metrics for stores they have access to
  is_store_accessible(store_id)
);

CREATE POLICY "Admins and owners can manage store metrics"
ON public.store_metrics
FOR ALL
USING (is_admin_or_owner())
WITH CHECK (is_admin_or_owner());

-- 4. Add missing RLS policies for other tables identified by the scanner

-- inventory_movements table
CREATE POLICY "Users can view inventory movements for accessible stores"
ON public.inventory_movements
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM inventory_stock inv
    WHERE inv.id = inventory_movements.inventory_stock_id
    AND is_store_accessible(inv.store_id)
  )
);

CREATE POLICY "Users can manage inventory movements for accessible stores"
ON public.inventory_movements
FOR ALL
USING (
  is_admin_or_owner() OR
  EXISTS (
    SELECT 1 FROM inventory_stock inv
    WHERE inv.id = inventory_movements.inventory_stock_id
    AND is_store_accessible(inv.store_id)
  )
)
WITH CHECK (
  is_admin_or_owner() OR
  EXISTS (
    SELECT 1 FROM inventory_stock inv
    WHERE inv.id = inventory_movements.inventory_stock_id
    AND is_store_accessible(inv.store_id)
  )
);

-- inventory_stock table
CREATE POLICY "Users can view inventory for accessible stores"
ON public.inventory_stock
FOR SELECT
USING (is_store_accessible(store_id));

CREATE POLICY "Users can manage inventory for accessible stores"
ON public.inventory_stock
FOR ALL
USING (is_store_accessible(store_id))
WITH CHECK (is_store_accessible(store_id));

-- products table
CREATE POLICY "Users can view products for accessible stores"
ON public.products
FOR SELECT
USING (is_store_accessible(store_id));

CREATE POLICY "Users can manage products for accessible stores"
ON public.products
FOR ALL
USING (is_store_accessible(store_id))
WITH CHECK (is_store_accessible(store_id));

-- product_catalog table  
CREATE POLICY "Users can view product catalog for accessible stores"
ON public.product_catalog
FOR SELECT
USING (is_store_accessible(store_id));

CREATE POLICY "Users can manage product catalog for accessible stores"
ON public.product_catalog
FOR ALL
USING (is_store_accessible(store_id))
WITH CHECK (is_store_accessible(store_id));