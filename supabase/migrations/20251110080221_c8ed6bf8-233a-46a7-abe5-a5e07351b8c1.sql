-- Security Fix: Enable RLS and add policies for exposed tables

-- 1. Fix stores table - restrict to authenticated users with proper access  
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Public read access to stores" ON public.stores;
  DROP POLICY IF EXISTS "Users can view stores they have access to" ON public.stores;
  DROP POLICY IF EXISTS "Users can view accessible stores" ON public.stores;
END $$;

CREATE POLICY "Users can view stores they have access to"
ON public.stores FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.user_id = auth.uid()
    AND au.is_active = true
    AND (
      au.role IN ('admin', 'owner')
      OR stores.id = ANY(au.store_ids)
    )
  )
);

-- 2. Fix auth_rate_limits - make it admin-only, no public access
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  DROP POLICY IF EXISTS "System can manage auth rate limits" ON public.auth_rate_limits;
  DROP POLICY IF EXISTS "System can insert rate limit records" ON public.auth_rate_limits;
  DROP POLICY IF EXISTS "System can update rate limit records" ON public.auth_rate_limits;
  DROP POLICY IF EXISTS "Admins can view rate limits" ON public.auth_rate_limits;
END $$;

CREATE POLICY "System can insert rate limit records"
ON public.auth_rate_limits FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update rate limit records"
ON public.auth_rate_limits FOR UPDATE
USING (true);

CREATE POLICY "Admins can view rate limits"
ON public.auth_rate_limits FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.user_id = auth.uid()
    AND au.role IN ('admin', 'owner')
    AND au.is_active = true
  )
);

-- 3. Enable RLS on backup tables with admin-only access
ALTER TABLE public.categories_backup_reset ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleanup_log ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Admin access only to categories_backup_reset" ON public.categories_backup_reset;
  DROP POLICY IF EXISTS "Admin access only to cleanup_log" ON public.cleanup_log;
END $$;

CREATE POLICY "Admin access only to categories_backup_reset"
ON public.categories_backup_reset FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.user_id = auth.uid()
    AND au.role IN ('admin', 'owner')
    AND au.is_active = true
  )
);

CREATE POLICY "Admin access only to cleanup_log"
ON public.cleanup_log FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.user_id = auth.uid()
    AND au.role IN ('admin', 'owner')
    AND au.is_active = true
  )
);

-- 4. Enable RLS on additional log tables if they exist
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'data_cleanup_log') THEN
    ALTER TABLE public.data_cleanup_log ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admin access only to data_cleanup_log" ON public.data_cleanup_log;
    CREATE POLICY "Admin access only to data_cleanup_log"
    ON public.data_cleanup_log FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM app_users au
        WHERE au.user_id = auth.uid()
        AND au.role IN ('admin', 'owner')
        AND au.is_active = true
      )
    );
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_reset_log') THEN
    ALTER TABLE public.system_reset_log ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admin access only to system_reset_log" ON public.system_reset_log;
    CREATE POLICY "Admin access only to system_reset_log"
    ON public.system_reset_log FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM app_users au
        WHERE au.user_id = auth.uid()
        AND au.role IN ('admin', 'owner')
        AND au.is_active = true
      )
    );
  END IF;
END $$;

-- 5. Enable RLS on deleted backup tables if they exist
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'deleted_sugbo_transactions_backup') THEN
    ALTER TABLE public.deleted_sugbo_transactions_backup ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admin access only to deleted_sugbo_transactions_backup" ON public.deleted_sugbo_transactions_backup;
    CREATE POLICY "Admin access only to deleted_sugbo_transactions_backup"
    ON public.deleted_sugbo_transactions_backup FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM app_users au
        WHERE au.user_id = auth.uid()
        AND au.role IN ('admin', 'owner')
        AND au.is_active = true
      )
    );
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'deleted_sugbo_purchase_orders_backup') THEN
    ALTER TABLE public.deleted_sugbo_purchase_orders_backup ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admin access only to deleted_sugbo_purchase_orders_backup" ON public.deleted_sugbo_purchase_orders_backup;
    CREATE POLICY "Admin access only to deleted_sugbo_purchase_orders_backup"
    ON public.deleted_sugbo_purchase_orders_backup FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM app_users au
        WHERE au.user_id = auth.uid()
        AND au.role IN ('admin', 'owner')
        AND au.is_active = true
      )
    );
  END IF;
END $$;