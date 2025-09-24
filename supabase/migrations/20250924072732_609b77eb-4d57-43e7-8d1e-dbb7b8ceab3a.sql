-- Update passwords for the specified users
-- Update password for manager.itpark@thecroffle.com
UPDATE auth.users 
SET encrypted_password = crypt('M4n@G3rIT', gen_salt('bf'))
WHERE email = 'manager.itpark@thecroffle.com';

-- Update password for cashier.itpark@thecroffle.com  
UPDATE auth.users 
SET encrypted_password = crypt('C4$hierIT', gen_salt('bf'))
WHERE email = 'cashier.itpark@thecroffle.com';