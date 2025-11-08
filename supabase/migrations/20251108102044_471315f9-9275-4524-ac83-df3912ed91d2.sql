-- Fix ambiguous column reference in check_auth_rate_limit_v2 function
-- The blocked_until column needs to be table-qualified to avoid ambiguity

CREATE OR REPLACE FUNCTION public.check_auth_rate_limit_v2(
  p_identifier text,
  p_identifier_type text,
  p_max_attempts integer DEFAULT 5,
  p_window_minutes integer DEFAULT 15,
  p_block_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_attempts integer := 0;
  v_window_start timestamp with time zone;
BEGIN
  v_window_start := now() - (p_window_minutes || ' minutes')::interval;
  
  -- Update or insert rate limit with proper table qualification
  INSERT INTO auth_rate_limits (identifier, identifier_type, attempt_count, first_attempt, last_attempt, blocked_until)
  VALUES (p_identifier, p_identifier_type, 1, now(), now(), NULL)
  ON CONFLICT (identifier, identifier_type)
  DO UPDATE SET
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
      ELSE auth_rate_limits.blocked_until  -- Fixed: properly qualified
    END;
  
  -- Get updated attempt count
  SELECT attempt_count INTO v_current_attempts
  FROM auth_rate_limits
  WHERE identifier = p_identifier AND identifier_type = p_identifier_type;
  
  RETURN v_current_attempts < p_max_attempts;
END;
$$;