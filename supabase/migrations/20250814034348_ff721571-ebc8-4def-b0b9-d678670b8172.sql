-- FINAL CRITICAL SECURITY FIX: Lock down business data access
-- This addresses the remaining critical vulnerabilities with proper column references

-- Secure stores table completely
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Drop any existing permissive policies
DROP POLICY IF EXISTS "Stores are accessible by everyone" ON public.stores;
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.stores;
DROP POLICY IF EXISTS "public access" ON public.stores;
DROP POLICY IF EXISTS "Users can view accessible stores" ON public.stores;
DROP POLICY IF EXISTS "Admins and owners can manage stores" ON public.stores;

-- Create strict store access policy
CREATE POLICY "Secure store access"
ON public.stores
FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    is_admin_or_owner() OR 
    is_store_accessible(id)
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    is_admin_or_owner() OR 
    is_store_accessible(id)
  )
);

-- Secure BIR cumulative sales table
ALTER TABLE public.bir_cumulative_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can manage cumulative sales" ON public.bir_cumulative_sales;
DROP POLICY IF EXISTS "Users can view cumulative sales for their stores" ON public.bir_cumulative_sales;
DROP POLICY IF EXISTS "Users can view sales data for accessible stores" ON public.bir_cumulative_sales;
DROP POLICY IF EXISTS "Admins and owners can manage cumulative sales" ON public.bir_cumulative_sales;

CREATE POLICY "Secure sales data access"
ON public.bir_cumulative_sales
FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    is_admin_or_owner() OR 
    is_store_accessible(store_id)
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    is_admin_or_owner() OR 
    is_store_accessible(store_id)
  )
);

-- Secure store metrics table
ALTER TABLE public.store_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view metrics for accessible stores" ON public.store_metrics;
DROP POLICY IF EXISTS "Admins and owners can manage store metrics" ON public.store_metrics;

CREATE POLICY "Secure metrics access"
ON public.store_metrics
FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    is_admin_or_owner() OR 
    is_store_accessible(store_id)
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    is_admin_or_owner() OR 
    is_store_accessible(store_id)
  )
);

-- Fix products table to ensure it's properly secured
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view products for accessible stores" ON public.products;
DROP POLICY IF EXISTS "Users can manage products for accessible stores" ON public.products;

CREATE POLICY "Secure product access"
ON public.products
FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    is_admin_or_owner() OR 
    is_store_accessible(store_id)
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    is_admin_or_owner() OR 
    is_store_accessible(store_id)
  )
);

-- Revoke all public access to prevent any bypass
REVOKE ALL ON public.stores FROM public;
REVOKE ALL ON public.bir_cumulative_sales FROM public;
REVOKE ALL ON public.store_metrics FROM public;
REVOKE ALL ON public.products FROM public;

-- Only grant access to authenticated users (RLS will handle the rest)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bir_cumulative_sales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;