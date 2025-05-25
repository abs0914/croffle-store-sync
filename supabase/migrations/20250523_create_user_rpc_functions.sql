-- Create RPC functions for user management

-- Function to get all users (admin/owner access)
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id text,
  user_id text,
  first_name text,
  last_name text,
  email text,
  contact_number text,
  role text,
  store_ids text[],
  is_active boolean,
  created_at text,
  updated_at text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is admin or owner
  IF NOT EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() AND au.role IN ('admin', 'owner')
  ) AND auth.email() != 'admin@example.com' THEN
    RAISE EXCEPTION 'Access denied. Admin or owner role required.';
  END IF;

  -- Return all users
  RETURN QUERY
  SELECT 
    au.id::text,
    au.user_id::text,
    au.first_name,
    au.last_name,
    au.email,
    au.contact_number,
    au.role::text,
    au.store_ids,
    au.is_active,
    au.created_at::text,
    au.updated_at::text
  FROM public.app_users au
  ORDER BY au.last_name, au.first_name;
END;
$$;

-- Function to get users for a specific store
CREATE OR REPLACE FUNCTION get_store_users(store_id_param text)
RETURNS TABLE (
  id text,
  user_id text,
  first_name text,
  last_name text,
  email text,
  contact_number text,
  role text,
  store_ids text[],
  is_active boolean,
  created_at text,
  updated_at text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user has access to this store
  IF NOT EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() 
    AND (
      au.role IN ('admin', 'owner') 
      OR store_id_param = ANY(au.store_ids)
    )
  ) AND auth.email() != 'admin@example.com' THEN
    RAISE EXCEPTION 'Access denied. You do not have access to this store.';
  END IF;

  -- Return users for the specified store
  RETURN QUERY
  SELECT 
    au.id::text,
    au.user_id::text,
    au.first_name,
    au.last_name,
    au.email,
    au.contact_number,
    au.role::text,
    au.store_ids,
    au.is_active,
    au.created_at::text,
    au.updated_at::text
  FROM public.app_users au
  WHERE store_id_param = ANY(au.store_ids)
  ORDER BY au.last_name, au.first_name;
END;
$$;

-- Function to get current user info
CREATE OR REPLACE FUNCTION get_current_user_info(user_email text DEFAULT NULL)
RETURNS TABLE (
  id text,
  user_id text,
  first_name text,
  last_name text,
  email text,
  contact_number text,
  role text,
  store_ids text[],
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_email text;
BEGIN
  -- Use provided email or current user's email
  target_email := COALESCE(user_email, auth.email());
  
  -- Return user info
  RETURN QUERY
  SELECT 
    au.id::text,
    au.user_id::text,
    au.first_name,
    au.last_name,
    au.email,
    au.contact_number,
    au.role::text,
    au.store_ids,
    au.is_active
  FROM public.app_users au
  WHERE au.email = target_email
  OR au.user_id = auth.uid();
END;
$$;

-- Function to create app user (if not exists)
CREATE OR REPLACE FUNCTION create_app_user(
  user_id text,
  user_email text,
  first_name text,
  last_name text,
  user_role text,
  store_ids text[],
  is_active boolean
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id text;
BEGIN
  -- Insert new user if not exists
  INSERT INTO public.app_users (
    user_id, email, first_name, last_name, role, store_ids, is_active
  )
  VALUES (
    user_id, user_email, first_name, last_name, user_role::app_role, store_ids, is_active
  )
  ON CONFLICT (email) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    store_ids = EXCLUDED.store_ids,
    is_active = EXCLUDED.is_active,
    updated_at = NOW()
  RETURNING id INTO new_user_id;
  
  RETURN new_user_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION get_store_users(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_info(text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_app_user(text, text, text, text, text, text[], boolean) TO authenticated;
