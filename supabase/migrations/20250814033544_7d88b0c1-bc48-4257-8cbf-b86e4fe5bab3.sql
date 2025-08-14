-- CRITICAL SECURITY FIXES MIGRATION
-- This migration addresses the most critical security vulnerabilities identified

-- 1. Fix Role Assignment Vulnerability - Remove email-based role detection
-- Replace with explicit admin email allowlist
CREATE OR REPLACE FUNCTION public.is_admin_email(email_address text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  admin_emails text[] := ARRAY[
    'admin@croffle.com',
    'owner@croffle.com'
  ];
BEGIN
  RETURN email_address = ANY(admin_emails);
END;
$$;

-- 2. Create comprehensive RLS policies for tables missing them
-- addon_categories policies
DROP POLICY IF EXISTS "Allow admins to manage addon categories" ON public.addon_categories;
DROP POLICY IF EXISTS "Allow authenticated users to view addon categories" ON public.addon_categories;
DROP POLICY IF EXISTS "Delete own addon categories" ON public.addon_categories;
DROP POLICY IF EXISTS "Insert own addon categories" ON public.addon_categories;
DROP POLICY IF EXISTS "Select own addon categories" ON public.addon_categories;
DROP POLICY IF EXISTS "Update own addon categories" ON public.addon_categories;

CREATE POLICY "Admins and owners can manage addon categories"
ON public.addon_categories
FOR ALL
USING (is_admin_or_owner())
WITH CHECK (is_admin_or_owner());

CREATE POLICY "Authenticated users can view addon categories"
ON public.addon_categories
FOR SELECT
USING (auth.role() = 'authenticated');

-- combo_pricing_rules policies
CREATE POLICY "Admins can manage combo pricing rules"
ON public.combo_pricing_rules
FOR ALL
USING (is_admin_or_owner())
WITH CHECK (is_admin_or_owner());

CREATE POLICY "Authenticated users can view combo pricing rules"
ON public.combo_pricing_rules
FOR SELECT
USING (auth.role() = 'authenticated');

-- 3. Enhance audit logging with security events
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  user_email text,
  ip_address inet,
  user_agent text,
  event_data jsonb DEFAULT '{}',
  risk_level text DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security audit logs"
ON public.security_audit_logs
FOR SELECT
USING (is_admin_or_owner());

CREATE POLICY "System can insert security audit logs"
ON public.security_audit_logs
FOR INSERT
WITH CHECK (true);

-- 4. Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_user_id uuid DEFAULT auth.uid(),
  p_user_email text DEFAULT NULL,
  p_event_data jsonb DEFAULT '{}',
  p_risk_level text DEFAULT 'low'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.security_audit_logs (
    event_type,
    user_id,
    user_email,
    event_data,
    risk_level
  ) VALUES (
    p_event_type,
    p_user_id,
    COALESCE(p_user_email, (SELECT email FROM auth.users WHERE id = p_user_id)),
    p_event_data,
    p_risk_level
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- 5. Update role assignment functions to use secure email validation
CREATE OR REPLACE FUNCTION public.assign_admin_role_securely(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Validate admin email against allowlist
  IF NOT is_admin_email(user_email) THEN
    PERFORM log_security_event(
      'unauthorized_admin_assignment_attempt',
      auth.uid(),
      user_email,
      jsonb_build_object('attempted_email', user_email),
      'high'
    );
    RETURN false;
  END IF;
  
  -- Get user ID
  SELECT id INTO target_user_id FROM auth.users WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Update or insert admin role
  INSERT INTO public.app_users (user_id, email, first_name, last_name, role, is_active)
  VALUES (target_user_id, user_email, 'Admin', 'User', 'admin', true)
  ON CONFLICT (user_id) DO UPDATE SET
    role = 'admin',
    is_active = true,
    updated_at = now();
  
  -- Log security event
  PERFORM log_security_event(
    'admin_role_assigned',
    target_user_id,
    user_email,
    jsonb_build_object('assigned_by', auth.uid()),
    'medium'
  );
  
  RETURN true;
END;
$$;

-- 6. Create trigger to monitor role changes
CREATE OR REPLACE FUNCTION public.monitor_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  -- Log role changes
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    PERFORM log_security_event(
      'user_role_changed',
      NEW.user_id,
      NEW.email,
      jsonb_build_object(
        'old_role', OLD.role,
        'new_role', NEW.role,
        'changed_by', auth.uid()
      ),
      CASE 
        WHEN NEW.role IN ('admin', 'owner') THEN 'high'
        ELSE 'medium'
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS monitor_app_users_role_changes ON public.app_users;
CREATE TRIGGER monitor_app_users_role_changes
  AFTER UPDATE ON public.app_users
  FOR EACH ROW
  EXECUTE FUNCTION public.monitor_role_changes();

-- 7. Enhanced password and authentication security
-- Function to validate password strength
CREATE OR REPLACE FUNCTION public.validate_password_strength(password text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  -- Minimum 8 characters, at least one uppercase, one lowercase, one number
  RETURN length(password) >= 8 
    AND password ~ '[A-Z]' 
    AND password ~ '[a-z]' 
    AND password ~ '[0-9]';
END;
$$;

-- 8. Rate limiting table for authentication attempts
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- email or IP
  identifier_type text NOT NULL CHECK (identifier_type IN ('email', 'ip')),
  attempt_count integer DEFAULT 1,
  first_attempt timestamp with time zone DEFAULT now(),
  last_attempt timestamp with time zone DEFAULT now(),
  blocked_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage auth rate limits"
ON public.auth_rate_limits
FOR ALL
USING (true)
WITH CHECK (true);

-- Create unique index for efficient lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_rate_limits_identifier 
ON public.auth_rate_limits(identifier, identifier_type);

-- 9. Function to check and update rate limits
CREATE OR REPLACE FUNCTION public.check_auth_rate_limit(
  p_identifier text,
  p_identifier_type text DEFAULT 'email',
  p_max_attempts integer DEFAULT 5,
  p_window_minutes integer DEFAULT 15,
  p_block_minutes integer DEFAULT 30
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_attempts integer := 0;
  v_blocked_until timestamp with time zone;
  v_window_start timestamp with time zone;
BEGIN
  v_window_start := now() - (p_window_minutes || ' minutes')::interval;
  
  -- Check existing rate limit record
  SELECT attempt_count, blocked_until
  INTO v_current_attempts, v_blocked_until
  FROM public.auth_rate_limits
  WHERE identifier = p_identifier 
    AND identifier_type = p_identifier_type;
  
  -- Check if currently blocked
  IF v_blocked_until IS NOT NULL AND v_blocked_until > now() THEN
    RETURN false;
  END IF;
  
  -- Update or insert rate limit record
  INSERT INTO public.auth_rate_limits (identifier, identifier_type, attempt_count)
  VALUES (p_identifier, p_identifier_type, 1)
  ON CONFLICT (identifier, identifier_type) DO UPDATE SET
    attempt_count = CASE 
      WHEN auth_rate_limits.last_attempt < v_window_start THEN 1
      ELSE auth_rate_limits.attempt_count + 1
    END,
    last_attempt = now(),
    blocked_until = CASE
      WHEN (CASE 
        WHEN auth_rate_limits.last_attempt < v_window_start THEN 1
        ELSE auth_rate_limits.attempt_count + 1
      END) >= p_max_attempts THEN now() + (p_block_minutes || ' minutes')::interval
      ELSE NULL
    END;
  
  -- Get updated attempt count
  SELECT attempt_count INTO v_current_attempts
  FROM public.auth_rate_limits
  WHERE identifier = p_identifier AND identifier_type = p_identifier_type;
  
  -- Log if blocked
  IF v_current_attempts >= p_max_attempts THEN
    PERFORM log_security_event(
      'auth_rate_limit_exceeded',
      NULL,
      p_identifier,
      jsonb_build_object(
        'attempts', v_current_attempts,
        'identifier_type', p_identifier_type
      ),
      'high'
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;