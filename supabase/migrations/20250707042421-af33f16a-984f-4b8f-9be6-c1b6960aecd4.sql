-- Create function to sync existing auth users to app_users table
CREATE OR REPLACE FUNCTION public.sync_auth_user_to_app_users(
  user_email TEXT,
  first_name TEXT,
  last_name TEXT,
  user_role app_role DEFAULT 'cashier',
  store_ids UUID[] DEFAULT '{}',
  contact_number TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  auth_user_id UUID;
  new_app_user_id UUID;
BEGIN
  -- Get the auth user ID
  SELECT id INTO auth_user_id 
  FROM auth.users 
  WHERE email = user_email;
  
  IF auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Auth user not found for email: %', user_email;
  END IF;
  
  -- Check if app_users record already exists
  SELECT id INTO new_app_user_id
  FROM app_users
  WHERE user_id = auth_user_id OR email = user_email;
  
  IF new_app_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'App user record already exists for email: %', user_email;
  END IF;
  
  -- Create the app_users record
  INSERT INTO app_users (
    user_id,
    email,
    first_name,
    last_name,
    role,
    store_ids,
    contact_number,
    is_active
  )
  VALUES (
    auth_user_id,
    user_email,
    first_name,
    last_name,
    user_role,
    store_ids,
    contact_number,
    true
  )
  RETURNING id INTO new_app_user_id;
  
  RETURN new_app_user_id;
END;
$$;