-- Security Fix 1: Add missing RLS policies for tables that have RLS enabled but no policies

-- Add RLS policies for grn_items table
CREATE POLICY "Users can view grn items for their stores" ON grn_items 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM goods_received_notes grn
    JOIN purchase_orders po ON grn.purchase_order_id = po.id
    JOIN app_users au ON au.user_id = auth.uid()
    WHERE grn.id = grn_items.grn_id
      AND (au.role = ANY(ARRAY['admin'::app_role, 'owner'::app_role]) 
           OR po.store_id = ANY(au.store_ids))
      AND au.is_active = true
  )
);

CREATE POLICY "Authorized users can manage grn items" ON grn_items 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM goods_received_notes grn
    JOIN purchase_orders po ON grn.purchase_order_id = po.id
    JOIN app_users au ON au.user_id = auth.uid()
    WHERE grn.id = grn_items.grn_id
      AND (au.role = ANY(ARRAY['admin'::app_role, 'owner'::app_role]) 
           OR ((au.role = ANY(ARRAY['manager'::app_role, 'stock_user'::app_role])) 
               AND po.store_id = ANY(au.store_ids)))
      AND au.is_active = true
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM goods_received_notes grn
    JOIN purchase_orders po ON grn.purchase_order_id = po.id
    JOIN app_users au ON au.user_id = auth.uid()
    WHERE grn.id = grn_items.grn_id
      AND (au.role = ANY(ARRAY['admin'::app_role, 'owner'::app_role]) 
           OR ((au.role = ANY(ARRAY['manager'::app_role, 'stock_user'::app_role])) 
               AND po.store_id = ANY(au.store_ids)))
      AND au.is_active = true
  )
);

-- Add RLS policies for inventory_transactions table (if it exists and needs policies)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_transactions' AND table_schema = 'public') THEN
    -- Check if policies already exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_transactions' AND policyname = 'Users can view inventory transactions for their stores') THEN
      EXECUTE 'CREATE POLICY "Users can view inventory transactions for their stores" ON inventory_transactions 
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM app_users au
          WHERE au.user_id = auth.uid()
            AND (au.role = ANY(ARRAY[''admin''::app_role, ''owner''::app_role]) 
                 OR inventory_transactions.store_id = ANY(au.store_ids))
            AND au.is_active = true
        )
      )';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_transactions' AND policyname = 'Authorized users can manage inventory transactions') THEN
      EXECUTE 'CREATE POLICY "Authorized users can manage inventory transactions" ON inventory_transactions 
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM app_users au
          WHERE au.user_id = auth.uid()
            AND (au.role = ANY(ARRAY[''admin''::app_role, ''owner''::app_role]) 
                 OR ((au.role = ANY(ARRAY[''manager''::app_role, ''stock_user''::app_role])) 
                     AND inventory_transactions.store_id = ANY(au.store_ids)))
            AND au.is_active = true
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM app_users au
          WHERE au.user_id = auth.uid()
            AND (au.role = ANY(ARRAY[''admin''::app_role, ''owner''::app_role]) 
                 OR ((au.role = ANY(ARRAY[''manager''::app_role, ''stock_user''::app_role])) 
                     AND inventory_transactions.store_id = ANY(au.store_ids)))
            AND au.is_active = true
        )
      )';
    END IF;
  END IF;
END $$;

-- Security Fix 2: Create secure helper functions with proper search_path
CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_users
    WHERE user_id = auth.uid()
      AND role = ANY(ARRAY['admin'::app_role, 'owner'::app_role])
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_admin_or_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_users
    WHERE user_id = auth.uid()
      AND role = ANY(ARRAY['admin'::app_role, 'owner'::app_role])
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_store_access(user_uuid uuid, store_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_users
    WHERE user_id = user_uuid
      AND (role = ANY(ARRAY['admin'::app_role, 'owner'::app_role]) 
           OR store_uuid = ANY(store_ids))
      AND is_active = true
  );
$$;

-- Security Fix 3: Update existing functions to have proper search_path
ALTER FUNCTION public.generate_fulfillment_number() SET search_path = public, auth;
ALTER FUNCTION public.reset_user_rate_limit(text) SET search_path = public, auth;
ALTER FUNCTION public.has_fulfillment_access(app_role) SET search_path = public, auth;
ALTER FUNCTION public.sync_user_stores() SET search_path = public, auth;
ALTER FUNCTION public.validate_recipe_template_cost() SET search_path = public, auth;
ALTER FUNCTION public.check_product_uniqueness() SET search_path = public, auth;
ALTER FUNCTION public.update_budget_alerts_updated_at() SET search_path = public, auth;
ALTER FUNCTION public.update_recipe_ingredients_updated_at() SET search_path = public, auth;

-- Security Fix 4: Add audit logging for security events
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid,
  user_email text,
  event_data jsonb,
  risk_level text NOT NULL DEFAULT 'low',
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security audit logs" ON security_audit_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM app_users
    WHERE user_id = auth.uid()
      AND role = ANY(ARRAY['admin'::app_role, 'owner'::app_role])
      AND is_active = true
  )
);

CREATE POLICY "System can insert security audit logs" ON security_audit_logs
FOR INSERT WITH CHECK (true);

-- Security Fix 5: Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_event_data jsonb DEFAULT NULL,
  p_risk_level text DEFAULT 'low'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO security_audit_logs (
    event_type,
    user_id,
    user_email,
    event_data,
    risk_level,
    created_at
  ) VALUES (
    p_event_type,
    auth.uid(),
    auth.email(),
    p_event_data,
    p_risk_level,
    now()
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Security Fix 6: Enhanced rate limiting functions
CREATE OR REPLACE FUNCTION public.check_auth_rate_limit(
  p_identifier text,
  p_identifier_type text DEFAULT 'email'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  rate_limit_record record;
  max_attempts integer := 5;
  window_minutes integer := 15;
  block_minutes integer := 30;
BEGIN
  -- Get or create rate limit record
  SELECT * INTO rate_limit_record
  FROM auth_rate_limits
  WHERE identifier = p_identifier 
    AND identifier_type = p_identifier_type;
  
  -- If no record exists, create one and allow
  IF NOT FOUND THEN
    INSERT INTO auth_rate_limits (
      identifier,
      identifier_type,
      attempt_count,
      first_attempt,
      last_attempt
    ) VALUES (
      p_identifier,
      p_identifier_type,
      1,
      now(),
      now()
    );
    RETURN true;
  END IF;
  
  -- Check if currently blocked
  IF rate_limit_record.blocked_until IS NOT NULL 
     AND rate_limit_record.blocked_until > now() THEN
    RETURN false;
  END IF;
  
  -- Reset if window has passed
  IF rate_limit_record.first_attempt < now() - interval '1 minute' * window_minutes THEN
    UPDATE auth_rate_limits
    SET attempt_count = 1,
        first_attempt = now(),
        last_attempt = now(),
        blocked_until = NULL
    WHERE identifier = p_identifier 
      AND identifier_type = p_identifier_type;
    RETURN true;
  END IF;
  
  -- Check if exceeded attempts
  IF rate_limit_record.attempt_count >= max_attempts THEN
    UPDATE auth_rate_limits
    SET blocked_until = now() + interval '1 minute' * block_minutes,
        last_attempt = now()
    WHERE identifier = p_identifier 
      AND identifier_type = p_identifier_type;
    RETURN false;
  END IF;
  
  -- Increment attempt count
  UPDATE auth_rate_limits
  SET attempt_count = attempt_count + 1,
      last_attempt = now()
  WHERE identifier = p_identifier 
    AND identifier_type = p_identifier_type;
  
  RETURN true;
END;
$$;

-- Security Fix 7: Password strength validation
CREATE OR REPLACE FUNCTION public.validate_password_strength(password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Password must be at least 8 characters
  IF length(password) < 8 THEN
    RETURN false;
  END IF;
  
  -- Must contain at least one lowercase letter
  IF password !~ '[a-z]' THEN
    RETURN false;
  END IF;
  
  -- Must contain at least one uppercase letter
  IF password !~ '[A-Z]' THEN
    RETURN false;
  END IF;
  
  -- Must contain at least one digit
  IF password !~ '[0-9]' THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;