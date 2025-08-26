-- Security Fix: Prevent privilege escalation in user role management
-- This migration addresses the critical security vulnerability where users could potentially
-- update their own roles to gain admin privileges

-- First, drop the existing problematic policies on app_users
DROP POLICY IF EXISTS "Admins and owners can update users" ON app_users;
DROP POLICY IF EXISTS "Users can update their own profile" ON app_users;

-- Create a security definer function to safely check admin/owner status
-- This prevents recursive RLS policy issues
CREATE OR REPLACE FUNCTION public.is_current_user_admin_or_owner()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Get the current user's role directly without triggering RLS
  SELECT role INTO user_role
  FROM app_users
  WHERE user_id = auth.uid()
  AND is_active = true
  LIMIT 1;
  
  RETURN user_role IN ('admin', 'owner');
END;
$$;

-- Create separate policies for different types of updates
-- Policy 1: Admins/owners can manage other users (including role changes)
CREATE POLICY "Admins can manage all users"
ON app_users
FOR ALL
TO authenticated
USING (public.is_current_user_admin_or_owner())
WITH CHECK (public.is_current_user_admin_or_owner());

-- Policy 2: Users can only update their own non-sensitive profile fields
-- This explicitly excludes role, store_ids, and other sensitive fields
CREATE POLICY "Users can update own profile"
ON app_users
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() 
  AND role = (SELECT role FROM app_users WHERE user_id = auth.uid())  -- Role cannot be changed by user
  AND store_ids = (SELECT store_ids FROM app_users WHERE user_id = auth.uid())  -- Store access cannot be changed by user
);

-- Policy 3: Users can view their own profile and admins can view all
CREATE POLICY "Users can view accessible profiles"
ON app_users
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR public.is_current_user_admin_or_owner()
);

-- Create audit table for role changes
CREATE TABLE IF NOT EXISTS public.user_role_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  old_role app_role,
  new_role app_role NOT NULL,
  changed_by uuid NOT NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  reason text,
  ip_address inet DEFAULT inet_client_addr(),
  user_agent text
);

-- Enable RLS on audit table
ALTER TABLE public.user_role_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view role audit logs"
ON public.user_role_audit
FOR SELECT
TO authenticated
USING (public.is_current_user_admin_or_owner());

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
ON public.user_role_audit
FOR INSERT
TO authenticated
WITH CHECK (changed_by = auth.uid());

-- Add input validation function for user data
CREATE OR REPLACE FUNCTION public.validate_user_input(
  p_email text,
  p_first_name text,
  p_last_name text,
  p_contact_number text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $$
BEGIN
  -- Validate email format
  IF p_email IS NULL OR p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Validate name fields (no special characters, reasonable length)
  IF p_first_name IS NULL OR LENGTH(TRIM(p_first_name)) < 1 OR LENGTH(p_first_name) > 50 THEN
    RAISE EXCEPTION 'First name must be between 1 and 50 characters';
  END IF;
  
  IF p_last_name IS NULL OR LENGTH(TRIM(p_last_name)) < 1 OR LENGTH(p_last_name) > 50 THEN
    RAISE EXCEPTION 'Last name must be between 1 and 50 characters';
  END IF;
  
  -- Validate first and last name contain only letters, spaces, hyphens, and apostrophes
  IF p_first_name !~ '^[A-Za-z\s\-'']+$' OR p_last_name !~ '^[A-Za-z\s\-'']+$' THEN
    RAISE EXCEPTION 'Names can only contain letters, spaces, hyphens, and apostrophes';
  END IF;
  
  -- Validate contact number if provided
  IF p_contact_number IS NOT NULL AND p_contact_number !~ '^\+?[0-9\s\-\(\)]+$' THEN
    RAISE EXCEPTION 'Invalid contact number format';
  END IF;
  
  RETURN true;
END;
$$;

-- Fix database functions security - add secure search path to critical functions
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE(id uuid, user_id uuid, first_name text, last_name text, email text, contact_number text, role text, store_ids uuid[], is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  requesting_user_role text;
BEGIN
  -- Get the current user's role with proper table qualification
  SELECT app_users.role::text INTO requesting_user_role FROM public.app_users WHERE app_users.user_id = auth.uid();
  
  -- Admin and owner can see all users, others only see themselves
  IF requesting_user_role IN ('admin', 'owner') THEN
    RETURN QUERY
    SELECT 
      au.id,
      au.user_id,
      au.first_name,
      au.last_name,
      au.email,
      au.contact_number,
      au.role::text,
      au.store_ids,
      au.is_active,
      au.created_at,
      au.updated_at
    FROM 
      public.app_users au;
  ELSE
    RETURN QUERY
    SELECT 
      au.id,
      au.user_id,
      au.first_name,
      au.last_name,
      au.email,
      au.contact_number,
      au.role::text,
      au.store_ids,
      au.is_active,
      au.created_at,
      au.updated_at
    FROM 
      public.app_users au
    WHERE 
      au.user_id = auth.uid();
  END IF;
END;
$$;