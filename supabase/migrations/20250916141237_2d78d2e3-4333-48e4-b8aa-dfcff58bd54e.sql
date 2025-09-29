-- Fix RLS Policy Conflicts for inventory_transactions
-- Remove conflicting policies and implement single consistent policy

-- First, drop existing conflicting policies
DROP POLICY IF EXISTS "Users can insert inventory transactions for their stores" ON public.inventory_transactions;
DROP POLICY IF EXISTS "Users can view inventory transactions for accessible stores" ON public.inventory_transactions;
DROP POLICY IF EXISTS "Enable insert for authenticated users based on store access" ON public.inventory_transactions;

-- Create single, consistent policy for inventory_transactions based on user_stores relationship
CREATE POLICY "Users can manage inventory transactions for accessible stores"
ON public.inventory_transactions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND (
        au.role = ANY(ARRAY['admin'::app_role, 'owner'::app_role])
        OR inventory_transactions.store_id = ANY(au.store_ids)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND (
        au.role = ANY(ARRAY['admin'::app_role, 'owner'::app_role])
        OR inventory_transactions.store_id = ANY(au.store_ids)
      )
  )
);

-- Create authentication context caching function for better reliability
CREATE OR REPLACE FUNCTION public.get_authenticated_user_with_fallback()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get current authenticated user
  SELECT auth.uid() INTO current_user_id;
  
  -- Return user ID if found
  IF current_user_id IS NOT NULL THEN
    RETURN current_user_id;
  END IF;
  
  -- Return null if no authentication context
  RETURN NULL;
END;
$$;

-- Create improved audit logging function with better error handling
CREATE OR REPLACE FUNCTION public.log_inventory_deduction_audit_safe(
  p_transaction_id uuid,
  p_store_id uuid,
  p_operation_type text,
  p_status text,
  p_items_processed integer DEFAULT 0,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  audit_id uuid;
  current_user_id uuid;
BEGIN
  -- Get authenticated user with fallback
  SELECT public.get_authenticated_user_with_fallback() INTO current_user_id;
  
  -- Insert audit log with proper error handling
  INSERT INTO inventory_audit_log (
    transaction_id,
    store_id,
    operation_type,
    status,
    items_processed,
    metadata,
    created_by,
    created_at
  ) VALUES (
    p_transaction_id,
    p_store_id,
    p_operation_type,
    p_status,
    p_items_processed,
    p_metadata || jsonb_build_object(
      'authenticated_user', current_user_id,
      'audit_timestamp', NOW()
    ),
    current_user_id,
    NOW()
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the transaction
    RAISE WARNING 'Audit logging failed: %', SQLERRM;
    RETURN null;
END;
$$;