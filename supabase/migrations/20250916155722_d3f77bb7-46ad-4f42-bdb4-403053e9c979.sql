-- Fix the audit logging function schema mismatch
-- Update log_inventory_deduction_audit_safe to match actual table schema

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
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  audit_id uuid;
  current_user_id uuid;
BEGIN
  -- Get authenticated user with fallback
  SELECT public.get_authenticated_user_with_fallback() INTO current_user_id;
  
  -- Insert audit log matching actual table schema
  -- inventory_audit_log has: id, transaction_id, operation_type, status, items_processed, metadata, created_at
  INSERT INTO inventory_audit_log (
    transaction_id,
    operation_type,
    status,
    items_processed,
    metadata,
    created_at
  ) VALUES (
    p_transaction_id,
    p_operation_type,
    p_status,
    p_items_processed,
    p_metadata || jsonb_build_object(
      'store_id', p_store_id,
      'authenticated_user', current_user_id,
      'audit_timestamp', NOW()
    ),
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