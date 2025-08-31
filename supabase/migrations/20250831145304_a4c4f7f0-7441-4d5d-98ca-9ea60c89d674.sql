-- Fix the function signature issue by dropping and recreating
DROP FUNCTION IF EXISTS public.user_has_store_access(uuid, uuid);

CREATE OR REPLACE FUNCTION public.user_has_store_access(user_uuid uuid, store_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.user_id = user_uuid
    AND au.is_active = true
    AND (
      au.role IN ('admin', 'owner')
      OR store_uuid = ANY(au.store_ids)
    )
  );
END;
$$;

-- Add the missing RLS policies that failed in the previous migration
CREATE POLICY "Users can manage transaction items for their stores"
ON transaction_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM transactions t
    JOIN app_users au ON (
      au.user_id = auth.uid() 
      AND au.is_active = true 
      AND (
        au.role IN ('admin', 'owner')
        OR t.store_id = ANY(au.store_ids)
      )
    )
    WHERE t.id = transaction_items.transaction_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM transactions t
    JOIN app_users au ON (
      au.user_id = auth.uid() 
      AND au.is_active = true 
      AND (
        au.role IN ('admin', 'owner')
        OR t.store_id = ANY(au.store_ids)
      )
    )
    WHERE t.id = transaction_items.transaction_id
  )
);