-- Fix critical security vulnerabilities for production readiness

-- 1. Secure stores table (contains sensitive business data)
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stores they have access to" 
ON public.stores 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_store_access usa
    WHERE usa.user_id = auth.uid() 
    AND usa.store_id = stores.id
    AND usa.can_access = true
  )
);

CREATE POLICY "Store managers can update their stores" 
ON public.stores 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_store_access usa
    WHERE usa.user_id = auth.uid() 
    AND usa.store_id = stores.id
    AND usa.role IN ('manager', 'owner')
  )
);

-- 2. Secure financial data tables
ALTER TABLE public.bir_cumulative_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view financial data for accessible stores" 
ON public.bir_cumulative_sales 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_store_access usa
    WHERE usa.user_id = auth.uid() 
    AND usa.store_id = bir_cumulative_sales.store_id
    AND usa.can_access = true
  )
);

CREATE POLICY "Only managers can insert financial data" 
ON public.bir_cumulative_sales 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_store_access usa
    WHERE usa.user_id = auth.uid() 
    AND usa.store_id = bir_cumulative_sales.store_id
    AND usa.role IN ('manager', 'owner')
  )
);

-- 3. Secure store metrics
ALTER TABLE public.store_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view metrics for accessible stores" 
ON public.store_metrics 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_store_access usa
    WHERE usa.user_id = auth.uid() 
    AND usa.store_id = store_metrics.store_id
    AND usa.can_access = true
  )
);

-- 4. Secure ingredient costs and pricing data
ALTER TABLE public.ingredient_unit_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ingredient costs for accessible stores" 
ON public.ingredient_unit_conversions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_store_access usa
    JOIN public.inventory_stock inv ON inv.store_id = usa.store_id
    WHERE usa.user_id = auth.uid() 
    AND inv.ingredient_id = ingredient_unit_conversions.ingredient_id
    AND usa.can_access = true
  )
);

ALTER TABLE public.product_add_ons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view add-ons for accessible stores" 
ON public.product_add_ons 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_store_access usa
    JOIN public.products p ON p.store_id = usa.store_id
    WHERE usa.user_id = auth.uid() 
    AND p.id = product_add_ons.product_id
    AND usa.can_access = true
  )
);

-- 5. Add missing RLS policies for tables that have RLS enabled but no policies
-- Assuming these tables exist and need policies based on linter output

-- User profiles (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
    EXECUTE 'CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id)';
  END IF;
END $$;

-- Customers table
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers') THEN
    EXECUTE 'CREATE POLICY "Users can view customers for accessible stores" ON public.customers FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.user_store_access usa
        WHERE usa.user_id = auth.uid() 
        AND usa.store_id = customers.store_id
        AND usa.can_access = true
      )
    )';
    EXECUTE 'CREATE POLICY "Staff can manage customers" ON public.customers FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.user_store_access usa
        WHERE usa.user_id = auth.uid() 
        AND usa.store_id = customers.store_id
        AND usa.can_access = true
      )
    )';
  END IF;
END $$;

-- Fix function search path issues by setting search_path for functions
-- Update key functions to have immutable search_path
ALTER FUNCTION public.validate_inventory_transaction(text, jsonb, text) 
SET search_path = public, auth;

ALTER FUNCTION public.secure_transaction_rollback(text) 
SET search_path = public, auth;