-- Fix security definer function search paths
CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM app_users
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'owner')
    AND is_active = true
  );
END;
$$;

-- Fix user access function
CREATE OR REPLACE FUNCTION public.user_has_store_access(user_uuid uuid, store_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.user_id = user_uuid
    AND au.is_active = true
    AND (
      au.role IN ('admin', 'owner')
      OR store_uuid = ANY(au.store_ids)
    )
  );
END;
$$;

-- Fix current user admin check
CREATE OR REPLACE FUNCTION public.is_current_user_admin_or_owner()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM app_users
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'owner')
    AND is_active = true
  );
END;
$$;

-- Add missing RLS policies for tables that need them
ALTER TABLE transaction_items ENABLE Row Level Security;

CREATE POLICY "Users can manage transaction items for their stores"
ON transaction_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM transactions t
    JOIN app_users au ON (
      au.user_id = auth.uid() 
      AND au.is_active = true 
      AND (
        au.role IN ('admin', 'owner')
        OR t.store_id = ANY(au.store_ids)
      )
    )
    WHERE t.id = transaction_items.transaction_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM transactions t
    JOIN app_users au ON (
      au.user_id = auth.uid() 
      AND au.is_active = true 
      AND (
        au.role IN ('admin', 'owner')
        OR t.store_id = ANY(au.store_ids)
      )
    )
    WHERE t.id = transaction_items.transaction_id
  )
);

-- Add RLS for inventory_transactions
ALTER TABLE inventory_transactions ENABLE Row Level Security;

CREATE POLICY "Users can view inventory transactions for their stores"
ON inventory_transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.user_id = auth.uid()
    AND au.is_active = true
    AND (
      au.role IN ('admin', 'owner')
      OR inventory_transactions.store_id = ANY(au.store_ids)
    )
  )
);

CREATE POLICY "System can manage inventory transactions"
ON inventory_transactions FOR ALL
USING (true)
WITH CHECK (true);

-- Add RLS for security_audit_logs
ALTER TABLE security_audit_logs ENABLE Row Level Security;

CREATE POLICY "System can insert security audit logs"
ON security_audit_logs FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view security audit logs"
ON security_audit_logs FOR SELECT
USING (is_admin_or_owner());

-- Add system performance monitoring table
CREATE TABLE IF NOT EXISTS system_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type text NOT NULL,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  store_id uuid REFERENCES stores(id),
  recorded_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add RLS for performance metrics
ALTER TABLE system_performance_metrics ENABLE Row Level Security;

CREATE POLICY "System can manage performance metrics"
ON system_performance_metrics FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can view performance metrics for their stores"
ON system_performance_metrics FOR SELECT
USING (
  store_id IS NULL OR
  EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.user_id = auth.uid()
    AND au.is_active = true
    AND (
      au.role IN ('admin', 'owner')
      OR system_performance_metrics.store_id = ANY(au.store_ids)
    )
  )
);

-- Create index for performance metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type_date 
ON system_performance_metrics(metric_type, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_store_date 
ON system_performance_metrics(store_id, recorded_at DESC);

-- Update existing functions to have proper search paths
CREATE OR REPLACE FUNCTION public.has_fulfillment_access(user_role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  RETURN user_role IN ('admin', 'owner', 'manager', 'stock_user');
END;
$$;