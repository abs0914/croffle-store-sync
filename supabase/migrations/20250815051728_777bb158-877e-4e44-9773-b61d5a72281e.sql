-- Clear any rate limiting data for the specific user
DELETE FROM auth_rate_limits WHERE identifier = 'charm.inventory@thecrofflestore.com';

-- Create a simpler function to reset rate limits for a user
CREATE OR REPLACE FUNCTION reset_user_rate_limit(user_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM auth_rate_limits WHERE identifier = user_email;
END;
$$;

-- Reset the rate limit for this specific user
SELECT reset_user_rate_limit('charm.inventory@thecrofflestore.com');