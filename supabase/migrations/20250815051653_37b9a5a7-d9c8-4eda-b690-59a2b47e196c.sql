-- Clear any rate limiting data for the specific user
DELETE FROM auth_rate_limits WHERE identifier = 'charm.inventory@thecrofflestore.com';

-- Create a function to reset rate limits for a user (if needed in future)
CREATE OR REPLACE FUNCTION reset_user_rate_limit(user_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM auth_rate_limits WHERE identifier = user_email;
    DELETE FROM security_audit_logs WHERE identifier = user_email AND event_type = 'failed_login';
END;
$$;

-- Reset the rate limit for this specific user
SELECT reset_user_rate_limit('charm.inventory@thecrofflestore.com');