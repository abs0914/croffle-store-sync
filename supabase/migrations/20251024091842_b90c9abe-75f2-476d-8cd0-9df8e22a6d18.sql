-- Update password for cashier.itpark@thecroffle.com
-- Note: This uses Supabase's auth.users table structure
-- The password will be hashed automatically

DO $$
DECLARE
  user_id_var uuid;
BEGIN
  -- Get the user ID for the email
  SELECT id INTO user_id_var
  FROM auth.users
  WHERE email = 'cashier.itpark@thecroffle.com';

  -- Check if user exists
  IF user_id_var IS NOT NULL THEN
    -- Update the password using crypt for proper hashing
    UPDATE auth.users
    SET 
      encrypted_password = crypt('C4$h1erIT', gen_salt('bf')),
      updated_at = now()
    WHERE id = user_id_var;
    
    RAISE NOTICE 'Password updated successfully for cashier.itpark@thecroffle.com';
  ELSE
    RAISE NOTICE 'User with email cashier.itpark@thecroffle.com not found';
  END IF;
END $$;