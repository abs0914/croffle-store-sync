-- COMPREHENSIVE FIX: Address remaining critical security vulnerabilities
-- The previous RLS policies may not have taken effect properly, so we'll ensure complete coverage

-- First, let's check which policies exist and drop any conflicting ones
DROP POLICY IF EXISTS "Stores are accessible by everyone" ON public.stores;
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.stores;
DROP POLICY IF EXISTS "public access" ON public.stores;

-- Ensure stores table has proper RLS
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Recreate store policies with explicit conditions
CREATE POLICY "Store access control"
ON public.stores
FOR ALL
USING (
  CASE 
    WHEN auth.uid() IS NULL THEN false  -- No unauthenticated access
    WHEN is_admin_or_owner() THEN true  -- Admins see all
    ELSE is_store_accessible(id)        -- Users see assigned stores only
  END
)
WITH CHECK (
  CASE 
    WHEN auth.uid() IS NULL THEN false
    WHEN is_admin_or_owner() THEN true
    ELSE is_store_accessible(id)
  END
);

-- Fix bir_cumulative_sales
ALTER TABLE public.bir_cumulative_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "System can manage cumulative sales" ON public.bir_cumulative_sales;

CREATE POLICY "Sales data access control"
ON public.bir_cumulative_sales
FOR ALL
USING (
  CASE 
    WHEN auth.uid() IS NULL THEN false
    WHEN is_admin_or_owner() THEN true
    ELSE is_store_accessible(store_id)
  END
)
WITH CHECK (
  CASE 
    WHEN auth.uid() IS NULL THEN false
    WHEN is_admin_or_owner() THEN true
    ELSE is_store_accessible(store_id)
  END
);

-- Fix store_metrics 
CREATE TABLE IF NOT EXISTS public.store_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  metric_date date NOT NULL,
  total_sales numeric DEFAULT 0,
  total_orders integer DEFAULT 0,
  average_order_value numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.store_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Metrics access control"
ON public.store_metrics
FOR ALL
USING (
  CASE 
    WHEN auth.uid() IS NULL THEN false
    WHEN is_admin_or_owner() THEN true
    ELSE is_store_accessible(store_id)
  END
)
WITH CHECK (
  CASE 
    WHEN auth.uid() IS NULL THEN false
    WHEN is_admin_or_owner() THEN true
    ELSE is_store_accessible(store_id)
  END
);

-- Fix product_add_ons if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_add_ons') THEN
    EXECUTE 'ALTER TABLE public.product_add_ons ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "product_add_ons access control" ON public.product_add_ons';
    EXECUTE 'CREATE POLICY "Product add-ons access control" ON public.product_add_ons FOR ALL USING (
      CASE 
        WHEN auth.uid() IS NULL THEN false
        WHEN is_admin_or_owner() THEN true
        ELSE EXISTS (
          SELECT 1 FROM products p 
          WHERE p.id = product_add_ons.product_id 
          AND is_store_accessible(p.store_id)
        )
      END
    ) WITH CHECK (
      CASE 
        WHEN auth.uid() IS NULL THEN false
        WHEN is_admin_or_owner() THEN true
        ELSE EXISTS (
          SELECT 1 FROM products p 
          WHERE p.id = product_add_ons.product_id 
          AND is_store_accessible(p.store_id)
        )
      END
    )';
  END IF;
END $$;

-- Ensure no public access is allowed on critical tables
REVOKE ALL ON public.stores FROM public;
REVOKE ALL ON public.bir_cumulative_sales FROM public;
REVOKE ALL ON public.store_metrics FROM public;

-- Grant specific permissions only to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bir_cumulative_sales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_metrics TO authenticated;