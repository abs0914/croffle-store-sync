-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if current user can access a store's data
CREATE OR REPLACE FUNCTION public.is_store_accessible(store UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  uid UUID := auth.uid();
  allowed BOOLEAN := FALSE;
BEGIN
  IF uid IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Admin/owner or explicit store access via app_users
  SELECT TRUE INTO allowed
  FROM app_users au
  WHERE au.user_id = uid
    AND (au.role IN ('admin','owner') OR store = ANY(au.store_ids))
  LIMIT 1;

  IF allowed THEN
    RETURN TRUE;
  END IF;

  -- Fallback to user_stores mapping
  SELECT TRUE INTO allowed
  FROM user_stores us
  WHERE us.user_id = uid AND us.store_id = store
  LIMIT 1;

  RETURN COALESCE(allowed, FALSE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_store_accessible(UUID) TO authenticated;

-- Clean up existing policies that reference other tables directly
DROP POLICY IF EXISTS "Managers and above can manage categories in their stores" ON public.categories;
DROP POLICY IF EXISTS "Users can delete categories in their assigned stores" ON public.categories;
DROP POLICY IF EXISTS "Users can insert categories to their assigned stores" ON public.categories;
DROP POLICY IF EXISTS "Users can update categories in their assigned stores" ON public.categories;
DROP POLICY IF EXISTS "Users can view categories from their assigned stores" ON public.categories;
DROP POLICY IF EXISTS "Users can view categories from their stores" ON public.categories;

-- Recreate policies using the security definer helper
CREATE POLICY "Categories are selectable by authorized users"
ON public.categories
FOR SELECT
TO authenticated
USING (public.is_store_accessible(store_id));

CREATE POLICY "Categories insert by authorized users"
ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (public.is_store_accessible(store_id));

CREATE POLICY "Categories update by authorized users"
ON public.categories
FOR UPDATE
TO authenticated
USING (public.is_store_accessible(store_id));

CREATE POLICY "Categories delete by authorized users"
ON public.categories
FOR DELETE
TO authenticated
USING (public.is_store_accessible(store_id));