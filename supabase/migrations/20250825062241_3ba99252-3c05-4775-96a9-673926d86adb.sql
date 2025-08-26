-- Fix database permission issues for inventory sync
-- Drop and recreate functions that access auth.users table incorrectly

-- Drop existing functions that need to be updated
DROP FUNCTION IF EXISTS public.is_store_accessible(uuid);
DROP FUNCTION IF EXISTS public.user_has_store_access(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_admin_or_owner();

-- Create a secure function to get current user info that doesn't access auth.users directly
CREATE OR REPLACE FUNCTION public.get_current_user_secure()
RETURNS TABLE(user_id uuid, role app_role, store_ids uuid[], is_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.user_id,
    au.role,
    au.store_ids,
    au.is_active
  FROM app_users au
  WHERE au.user_id = auth.uid()
    AND au.is_active = true
  LIMIT 1;
END;
$$;

-- Create a function to ensure all authenticated users have app_users records
CREATE OR REPLACE FUNCTION public.sync_missing_app_users()
RETURNS TABLE(synced_count integer, error_details text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sync_count integer := 0;
  auth_user record;
BEGIN
  -- Get auth users that don't have app_users records
  FOR auth_user IN 
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    LEFT JOIN app_users au ON u.id = au.user_id
    WHERE au.user_id IS NULL
    AND u.email IS NOT NULL
  LOOP
    BEGIN
      -- Create missing app_user record
      INSERT INTO app_users (
        user_id,
        email,
        first_name,
        last_name,
        role,
        store_ids,
        is_active
      ) VALUES (
        auth_user.id,
        auth_user.email,
        COALESCE(auth_user.raw_user_meta_data->>'first_name', split_part(auth_user.email, '@', 1)),
        COALESCE(auth_user.raw_user_meta_data->>'last_name', ''),
        'cashier'::app_role,
        '{}',
        true
      );
      
      sync_count := sync_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue
      RAISE NOTICE 'Failed to sync user %: %', auth_user.email, SQLERRM;
    END;
  END LOOP;
  
  RETURN QUERY SELECT sync_count, NULL::text;
END;
$$;

-- Recreate the is_admin_or_owner function to use app_users only
CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM app_users au
    WHERE au.user_id = auth.uid() 
      AND au.role IN ('admin', 'owner')
      AND au.is_active = true
  );
END;
$$;

-- Recreate is_store_accessible function to use app_users only
CREATE OR REPLACE FUNCTION public.is_store_accessible(store_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin/owner (has access to all stores)
  IF EXISTS (
    SELECT 1 
    FROM app_users au
    WHERE au.user_id = auth.uid() 
      AND au.role IN ('admin', 'owner')
      AND au.is_active = true
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user has access to specific store
  RETURN EXISTS (
    SELECT 1 
    FROM app_users au
    WHERE au.user_id = auth.uid()
      AND store_id_param = ANY(au.store_ids)
      AND au.is_active = true
  );
END;
$$;

-- Recreate user_has_store_access function to use app_users only
CREATE OR REPLACE FUNCTION public.user_has_store_access(user_id_param uuid, store_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin/owner (has access to all stores)
  IF EXISTS (
    SELECT 1 
    FROM app_users au
    WHERE au.user_id = user_id_param 
      AND au.role IN ('admin', 'owner')
      AND au.is_active = true
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user has access to specific store
  RETURN EXISTS (
    SELECT 1 
    FROM app_users au
    WHERE au.user_id = user_id_param
      AND store_id_param = ANY(au.store_ids)
      AND au.is_active = true
  );
END;
$$;

-- Sync any missing app_users records immediately
SELECT * FROM sync_missing_app_users();