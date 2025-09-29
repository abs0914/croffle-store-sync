-- Update password for cashier.itpark@thecroffle.com
-- This uses Supabase's admin API functions to securely update the password

DO $$
DECLARE
    user_uuid uuid;
BEGIN
    -- Get the user ID from auth.users for the email
    SELECT id INTO user_uuid 
    FROM auth.users 
    WHERE email = 'cashier.itpark@thecroffle.com';
    
    -- Check if user exists
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'User with email cashier.itpark@thecroffle.com not found';
    END IF;
    
    -- Update the user's password using admin function
    -- Note: This requires admin privileges and updates the encrypted password
    UPDATE auth.users 
    SET 
        encrypted_password = crypt('C4$hier1T', gen_salt('bf')),
        updated_at = now()
    WHERE id = user_uuid;
    
    -- Log the password update
    RAISE NOTICE 'Password updated successfully for user: cashier.itpark@thecroffle.com (ID: %)', user_uuid;
    
END $$;