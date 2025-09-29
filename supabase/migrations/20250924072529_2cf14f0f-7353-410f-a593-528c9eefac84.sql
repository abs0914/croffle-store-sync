-- First, handle the user deletion by cleaning up related records
-- Delete from security_audit_logs for the user to be deleted
DELETE FROM security_audit_logs 
WHERE user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'kathrence.purchasing@thecrofflestore.com'
);

-- Delete from app_users table
DELETE FROM app_users 
WHERE user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'kathrence.purchasing@thecrofflestore.com'
);

-- Now delete the auth user
DELETE FROM auth.users 
WHERE email = 'kathrence.purchasing@thecrofflestore.com';

-- Update passwords for the specified users
-- Note: These will need to be executed through the Supabase Auth Admin API
-- The passwords provided will be hashed automatically by Supabase

-- Update password for manager.itpark@thecroffle.com
UPDATE auth.users 
SET encrypted_password = crypt('C4$hierIT', gen_salt('bf'))
WHERE email = 'manager.itpark@thecroffle.com';

-- Update password for cashier.itpark@thecroffle.com  
UPDATE auth.users 
SET encrypted_password = crypt('M4n@G3rIT', gen_salt('bf'))
WHERE email = 'cashier.itpark@thecroffle.com';