
-- Phase 1: Critical RLS Policy Implementation
-- Enable RLS on core unprotected tables

-- Enable RLS on stores table (if not already enabled)
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Enable RLS on products table
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Enable RLS on customers table  
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Enable RLS on categories table
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies for stores
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

CREATE POLICY "Admins and owners can manage stores" 
ON public.stores FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() 
    AND au.role IN ('admin', 'owner')
  )
);

-- Create RLS policies for products
CREATE POLICY "Users can view products from their stores" 
ON public.products FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() 
    AND (
      au.role IN ('admin', 'owner') 
      OR products.store_id = ANY(au.store_ids)
    )
  )
);

CREATE POLICY "Managers and above can manage products in their stores" 
ON public.products FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() 
    AND (
      au.role IN ('admin', 'owner') 
      OR (au.role = 'manager' AND products.store_id = ANY(au.store_ids))
    )
  )
);

-- Create RLS policies for customers
CREATE POLICY "Users can view customers from their stores" 
ON public.customers FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() 
    AND (
      au.role IN ('admin', 'owner') 
      OR customers.store_id = ANY(au.store_ids)
    )
  )
);

CREATE POLICY "Users can manage customers in their stores" 
ON public.customers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() 
    AND (
      au.role IN ('admin', 'owner') 
      OR customers.store_id = ANY(au.store_ids)
    )
  )
);

-- Create RLS policies for categories
CREATE POLICY "Users can view categories from their stores" 
ON public.categories FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() 
    AND (
      au.role IN ('admin', 'owner') 
      OR categories.store_id = ANY(au.store_ids)
    )
  )
);

CREATE POLICY "Managers and above can manage categories in their stores" 
ON public.categories FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() 
    AND (
      au.role IN ('admin', 'owner') 
      OR (au.role = 'manager' AND categories.store_id = ANY(au.store_ids))
    )
  )
);

-- Remove hardcoded email bypasses and improve security functions
-- Update the is_admin_or_owner function to remove hardcoded bypasses
CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get the role directly from app_users table without email bypass
  SELECT role INTO user_role 
  FROM public.app_users 
  WHERE user_id = auth.uid()
  AND is_active = true;
  
  RETURN user_role IN ('admin', 'owner');
END;
$$;

-- Update create_app_user function to remove email bypass
CREATE OR REPLACE FUNCTION public.create_app_user(
  user_id uuid, 
  user_email text, 
  first_name text, 
  last_name text, 
  user_role text, 
  store_ids uuid[], 
  is_active boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_id UUID;
  current_user_role TEXT;
BEGIN
  -- Check if current user has permission to create users
  SELECT role INTO current_user_role 
  FROM public.app_users 
  WHERE user_id = auth.uid() 
  AND is_active = true;
  
  -- Only admin and owner can create users
  IF current_user_role NOT IN ('admin', 'owner') THEN
    RAISE EXCEPTION 'Insufficient permissions to create users';
  END IF;

  -- Check if user already exists
  SELECT id INTO new_id FROM public.app_users WHERE email = user_email LIMIT 1;
  
  IF new_id IS NULL THEN
    -- Insert new user
    INSERT INTO public.app_users(
      user_id,
      email,
      first_name,
      last_name,
      role,
      store_ids,
      is_active
    ) VALUES (
      user_id,
      user_email,
      first_name,
      last_name,
      user_role::app_role,
      store_ids,
      is_active
    )
    RETURNING id INTO new_id;
  ELSE
    -- Update existing user
    UPDATE public.app_users
    SET
      user_id = COALESCE(create_app_user.user_id, app_users.user_id),
      first_name = create_app_user.first_name,
      last_name = create_app_user.last_name,
      role = user_role::app_role,
      store_ids = create_app_user.store_ids,
      is_active = create_app_user.is_active,
      updated_at = now()
    WHERE id = new_id;
  END IF;
  
  RETURN new_id;
END;
$$;

-- Create security audit log table for persistent logging
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  event_details jsonb,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  severity text DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical'))
);

-- Enable RLS on security audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view security logs
CREATE POLICY "Admins can view security audit logs" 
ON public.security_audit_log FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() 
    AND au.role = 'admin'
  )
);

-- System can insert security logs
CREATE POLICY "System can insert security audit logs" 
ON public.security_audit_log FOR INSERT 
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON public.security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON public.security_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON public.security_audit_log(user_id);

-- Grant necessary permissions
GRANT SELECT, INSERT ON public.security_audit_log TO authenticated;
GRANT SELECT, INSERT ON public.security_audit_log TO service_role;
