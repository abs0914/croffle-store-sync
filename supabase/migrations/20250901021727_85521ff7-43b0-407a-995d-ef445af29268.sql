-- Fix function conflict and continue security fixes
DROP FUNCTION IF EXISTS public.user_has_store_access(uuid, uuid);

-- Recreate the function with proper security
CREATE OR REPLACE FUNCTION public.user_has_store_access(user_uuid uuid, store_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_users
    WHERE user_id = user_uuid
      AND (role = ANY(ARRAY['admin'::app_role, 'owner'::app_role]) 
           OR store_uuid = ANY(store_ids))
      AND is_active = true
  );
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.user_has_store_access(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin_or_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_security_event(text, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_auth_rate_limit(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_password_strength(text) TO authenticated;