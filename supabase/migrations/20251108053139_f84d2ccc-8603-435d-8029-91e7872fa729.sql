-- Fix type casting for inventory movements cleanup
CREATE OR REPLACE FUNCTION delete_store_transactions_by_date(
  p_store_id uuid,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  deleted_count integer,
  deleted_receipts text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count integer;
  v_deleted_receipts text;
  v_current_user_id uuid;
BEGIN
  -- Get current user ID
  v_current_user_id := auth.uid();
  
  -- Check permissions only if there is an authenticated user
  IF v_current_user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM app_users
      WHERE user_id = v_current_user_id
        AND role IN ('admin', 'owner')
        AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Permission denied: Only admins and owners can delete transactions';
    END IF;
  END IF;

  -- Delete transactions and capture results
  WITH deleted AS (
    DELETE FROM transactions
    WHERE store_id = p_store_id
      AND DATE(created_at) = p_date
    RETURNING id, receipt_number
  )
  SELECT 
    COUNT(*)::integer,
    STRING_AGG(receipt_number, ', ')
  INTO v_deleted_count, v_deleted_receipts
  FROM deleted;

  -- Clean up orphaned transaction items
  DELETE FROM transaction_items ti
  WHERE NOT EXISTS (
    SELECT 1 FROM transactions t WHERE t.id = ti.transaction_id
  );

  -- Clean up orphaned inventory movements (proper type casting)
  DELETE FROM inventory_movements im
  WHERE im.reference_type = 'transaction'
    AND NOT EXISTS (
      SELECT 1 FROM transactions t WHERE t.id = im.reference_id::uuid
    );

  RETURN QUERY SELECT v_deleted_count, COALESCE(v_deleted_receipts, 'None');
END;
$$;