-- Fix database permission issues for inventory sync
-- Update function implementations to use app_users instead of auth.users
-- without dropping them to avoid breaking dependencies

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

-- Update existing functions to use app_users instead of auth.users
-- Keep same signatures to maintain RLS policy compatibility

-- Update is_admin_or_owner function
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

-- Update is_store_accessible function 
CREATE OR REPLACE FUNCTION public.is_store_accessible(store_id uuid)
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
      AND store_id = ANY(au.store_ids)
      AND au.is_active = true
  );
END;
$$;

-- Update user_has_store_access function
CREATE OR REPLACE FUNCTION public.user_has_store_access(user_id uuid, store_id uuid)
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
    WHERE au.user_id = user_id 
      AND au.role IN ('admin', 'owner')
      AND au.is_active = true
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user has access to specific store
  RETURN EXISTS (
    SELECT 1 
    FROM app_users au
    WHERE au.user_id = user_id
      AND store_id = ANY(au.store_ids)
      AND au.is_active = true
  );
END;
$$;

-- Update is_current_user_admin_or_owner function if it exists
CREATE OR REPLACE FUNCTION public.is_current_user_admin_or_owner()
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

-- Sync any missing app_users records to fix permission issues
SELECT * FROM sync_missing_app_users();