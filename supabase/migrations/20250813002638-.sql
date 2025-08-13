-- 1) Remove overly broad SELECT policy exposing app_users to all authenticated users
DROP POLICY IF EXISTS "authenticated_users_can_read" ON public.app_users;

-- 2) Harden get_store_users: allow only admins/owners, or managers with access to the target store
CREATE OR REPLACE FUNCTION public.get_store_users(store_id_param uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  first_name text,
  last_name text,
  email text,
  contact_number text,
  role text,
  store_ids uuid[],
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_role app_role;
  current_stores uuid[];
BEGIN
  -- Get current user's role and stores using a SECURITY DEFINER helper
  SELECT user_role, user_store_ids
  INTO current_role, current_stores
  FROM public.get_current_user_info();

  -- Authorization: Admins/Owners can view any store; managers only their stores
  IF current_role NOT IN ('admin', 'owner') AND NOT (store_id_param = ANY(current_stores)) THEN
    RAISE EXCEPTION 'Not authorized to view users for this store';
  END IF;

  RETURN QUERY
  SELECT 
    au.id,
    au.user_id,
    au.first_name,
    au.last_name,
    au.email,
    au.contact_number,
    au.role::text,
    au.store_ids,
    au.is_active,
    au.created_at,
    au.updated_at
  FROM public.app_users au
  WHERE store_id_param = ANY(au.store_ids);
END;
$function$;

-- 3) Provide a safe get_all_users for admin/owner only (used by UI when no store filter)
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  first_name text,
  last_name text,
  email text,
  contact_number text,
  role text,
  store_ids uuid[],
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin_or_owner() THEN
    RAISE EXCEPTION 'Not authorized to list all users';
  END IF;

  RETURN QUERY
  SELECT 
    au.id,
    au.user_id,
    au.first_name,
    au.last_name,
    au.email,
    au.contact_number,
    au.role::text,
    au.store_ids,
    au.is_active,
    au.created_at,
    au.updated_at
  FROM public.app_users au;
END;
$function$;