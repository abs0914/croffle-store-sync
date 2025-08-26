-- Fix critical security vulnerabilities - Create missing table and secure sensitive data

-- 1. Create user_store_access table that other policies depend on
CREATE TABLE IF NOT EXISTS public.user_store_access (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  store_id uuid NOT NULL,
  can_access boolean NOT NULL DEFAULT true,
  role text DEFAULT 'staff',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, store_id)
);

-- Enable RLS on the table
ALTER TABLE public.user_store_access ENABLE ROW LEVEL SECURITY;

-- Create basic policies for user_store_access
CREATE POLICY "Users can view their own store access" 
ON public.user_store_access 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all store access" 
ON public.user_store_access 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid() 
    AND au.role IN ('admin', 'owner')
    AND au.is_active = true
  )
);

-- 2. Now secure the critical tables with proper RLS
-- Secure stores table (contains sensitive business data)
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stores they have access to" 
ON public.stores 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid() 
    AND (
      au.role IN ('admin', 'owner') 
      OR stores.id = ANY(au.store_ids)
    )
    AND au.is_active = true
  )
);

CREATE POLICY "Store managers can update their stores" 
ON public.stores 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid() 
    AND (
      au.role IN ('admin', 'owner')
      OR (au.role = 'manager' AND stores.id = ANY(au.store_ids))
    )
    AND au.is_active = true
  )
);

-- 3. Secure financial data tables
ALTER TABLE public.bir_cumulative_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view financial data for accessible stores" 
ON public.bir_cumulative_sales 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid() 
    AND (
      au.role IN ('admin', 'owner')
      OR bir_cumulative_sales.store_id = ANY(au.store_ids)
    )
    AND au.is_active = true
  )
);

CREATE POLICY "Only managers can insert financial data" 
ON public.bir_cumulative_sales 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid() 
    AND (
      au.role IN ('admin', 'owner')
      OR (au.role IN ('manager', 'cashier') AND bir_cumulative_sales.store_id = ANY(au.store_ids))
    )
    AND au.is_active = true
  )
);

-- 4. Secure store metrics
ALTER TABLE public.store_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view metrics for accessible stores" 
ON public.store_metrics 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid() 
    AND (
      au.role IN ('admin', 'owner')
      OR store_metrics.store_id = ANY(au.store_ids)
    )
    AND au.is_active = true
  )
);

-- 5. Secure ingredient costs and pricing data
ALTER TABLE public.ingredient_unit_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view ingredient costs" 
ON public.ingredient_unit_conversions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid() 
    AND au.role IN ('admin', 'owner', 'manager')
    AND au.is_active = true
  )
);

ALTER TABLE public.product_add_ons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view add-ons for accessible stores" 
ON public.product_add_ons 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    JOIN public.products p ON p.store_id = ANY(au.store_ids)
    WHERE au.user_id = auth.uid() 
    AND p.id = product_add_ons.product_id
    AND (
      au.role IN ('admin', 'owner')
      OR p.store_id = ANY(au.store_ids)
    )
    AND au.is_active = true
  )
);

-- 6. Populate user_store_access from existing app_users data
INSERT INTO public.user_store_access (user_id, store_id, role, can_access)
SELECT 
  au.user_id,
  store_id,
  au.role::text,
  true
FROM public.app_users au
CROSS JOIN LATERAL unnest(au.store_ids) AS store_id
WHERE au.store_ids IS NOT NULL
ON CONFLICT (user_id, store_id) DO NOTHING;