-- Clear the specific rate limit record causing the issue (case-sensitive)
DELETE FROM auth_rate_limits WHERE identifier = 'Charm.inventory@thecrofflestore.com';

-- Also clear any other variations just to be safe
DELETE FROM auth_rate_limits WHERE LOWER(identifier) = 'charm.inventory@thecrofflestore.com';

-- Update the reset function to be case-insensitive
CREATE OR REPLACE FUNCTION public.reset_user_rate_limit(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete all rate limit records for this email (case-insensitive)
    DELETE FROM auth_rate_limits WHERE LOWER(identifier) = LOWER(user_email);
END;
$$;