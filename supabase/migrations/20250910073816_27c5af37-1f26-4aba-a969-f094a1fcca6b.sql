-- Fix the authentication rate limiting system
-- 1. Create a new function that only checks if user is currently blocked (doesn't increment)
CREATE OR REPLACE FUNCTION public.is_user_rate_limited(
  p_identifier text,
  p_identifier_type text DEFAULT 'email'
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is currently blocked
  RETURN EXISTS (
    SELECT 1 FROM auth_rate_limits 
    WHERE identifier = p_identifier 
      AND identifier_type = p_identifier_type
      AND blocked_until IS NOT NULL 
      AND blocked_until > now()
  );
END;
$$;

-- 2. Create a function to record failed login attempts
CREATE OR REPLACE FUNCTION public.record_failed_login_attempt(
  p_identifier text,
  p_identifier_type text DEFAULT 'email',
  p_max_attempts integer DEFAULT 5,
  p_window_minutes integer DEFAULT 15,
  p_block_minutes integer DEFAULT 30
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_attempts integer := 0;
  v_window_start timestamp with time zone;
BEGIN
  v_window_start := now() - (p_window_minutes || ' minutes')::interval;
  
  -- Update or insert rate limit record for failed attempt
  INSERT INTO public.auth_rate_limits (identifier, identifier_type, attempt_count, first_attempt, last_attempt)
  VALUES (p_identifier, p_identifier_type, 1, now(), now())
  ON CONFLICT (identifier, identifier_type) DO UPDATE SET
    attempt_count = CASE 
      WHEN auth_rate_limits.last_attempt < v_window_start THEN 1
      ELSE auth_rate_limits.attempt_count + 1
    END,
    last_attempt = now(),
    first_attempt = CASE 
      WHEN auth_rate_limits.last_attempt < v_window_start THEN now()
      ELSE auth_rate_limits.first_attempt
    END,
    blocked_until = CASE
      WHEN (CASE 
        WHEN auth_rate_limits.last_attempt < v_window_start THEN 1
        ELSE auth_rate_limits.attempt_count + 1
      END) >= p_max_attempts THEN now() + (p_block_minutes || ' minutes')::interval
      ELSE blocked_until
    END;
  
  -- Get updated attempt count
  SELECT attempt_count INTO v_current_attempts
  FROM public.auth_rate_limits
  WHERE identifier = p_identifier AND identifier_type = p_identifier_type;
  
  -- Log if blocked
  IF v_current_attempts >= p_max_attempts THEN
    PERFORM log_security_event(
      'auth_rate_limit_exceeded',
      NULL,
      p_identifier,
      jsonb_build_object(
        'attempts', v_current_attempts,
        'identifier_type', p_identifier_type
      ),
      'high'
    );
    RETURN false; -- User is now blocked
  END IF;
  
  RETURN true; -- User is not blocked
END;
$$;

-- 3. Create a function to clear rate limits on successful login
CREATE OR REPLACE FUNCTION public.clear_successful_login_rate_limit(
  p_identifier text,
  p_identifier_type text DEFAULT 'email'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clear rate limit record on successful login
  DELETE FROM auth_rate_limits 
  WHERE identifier = p_identifier 
    AND identifier_type = p_identifier_type;
END;
$$;