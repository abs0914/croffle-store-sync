-- Drop the existing function and recreate it with proper parameter names
DROP FUNCTION IF EXISTS public.create_app_user(uuid,text,text,text,text,uuid[],boolean);

-- Recreate the function with fixed parameter names to avoid ambiguous references
CREATE OR REPLACE FUNCTION public.create_app_user(
  p_user_id uuid, 
  p_user_email text, 
  p_first_name text, 
  p_last_name text, 
  p_user_role text, 
  p_store_ids uuid[], 
  p_is_active boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_id UUID;
  current_user_role TEXT;
BEGIN
  -- Check if current user has permission to create users
  SELECT role INTO current_user_role 
  FROM public.app_users 
  WHERE app_users.user_id = auth.uid() 
  AND is_active = true;
  
  -- Only admin and owner can create users
  IF current_user_role NOT IN ('admin', 'owner') THEN
    RAISE EXCEPTION 'Insufficient permissions to create users';
  END IF;

  -- Check if user already exists
  SELECT id INTO new_id FROM public.app_users WHERE email = p_user_email LIMIT 1;
  
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
      p_user_id,
      p_user_email,
      p_first_name,
      p_last_name,
      p_user_role::app_role,
      p_store_ids,
      p_is_active
    )
    RETURNING id INTO new_id;
  ELSE
    -- Update existing user
    UPDATE public.app_users
    SET
      user_id = COALESCE(p_user_id, app_users.user_id),
      first_name = p_first_name,
      last_name = p_last_name,
      role = p_user_role::app_role,
      store_ids = p_store_ids,
      is_active = p_is_active,
      updated_at = now()
    WHERE id = new_id;
  END IF;
  
  RETURN new_id;
END;
$$;

-- Also clean up the failed user record for kimhe.admin@thecrofflestore.com
DELETE FROM public.app_users WHERE email = 'kimhe.admin@thecrofflestore.com' AND role = 'cashier';