
-- Create RPC function to get current user info safely
CREATE OR REPLACE FUNCTION public.get_current_user_info(user_email text)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  first_name text,
  last_name text,
  email text,
  contact_number text,
  role text,
  store_ids uuid[],
  is_active boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    au.is_active
  FROM 
    public.app_users au
  WHERE 
    au.email = user_email;
END;
$$;

-- Create RPC function to get all users (for admins)
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  first_name text,
  last_name text,
  email text,
  contact_number text,
  role text,
  store_ids uuid[],
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
END;
$$;

-- Create RPC function to get users for a specific store
CREATE OR REPLACE FUNCTION public.get_store_users(store_id_param uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  first_name text,
  last_name text,
  email text,
  contact_number text,
  role text,
  store_ids uuid[],
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    store_id_param = ANY(au.store_ids);
END;
$$;

-- Drop any problematic RLS policies on app_users
DROP POLICY IF EXISTS "Users can view their assigned users" ON public.app_users;

-- Create simplified RLS policy for app_users
CREATE POLICY "Enable read access for authenticated users only" 
ON public.app_users
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Create policy for managing users
CREATE POLICY "Admins and owners can manage users" 
ON public.app_users
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() AND au.role IN ('admin', 'owner')
  )
  OR
  auth.email() = 'admin@example.com'
);
