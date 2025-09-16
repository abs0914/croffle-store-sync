-- Fix the log_inventory_sync_result function to handle foreign key constraint violations gracefully
CREATE OR REPLACE FUNCTION public.log_inventory_sync_result(
  p_transaction_id uuid,
  p_sync_status text,
  p_error_details text DEFAULT NULL::text,
  p_items_processed integer DEFAULT 0,
  p_sync_duration_ms integer DEFAULT 0,
  p_affected_inventory_items jsonb DEFAULT NULL::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- First check if the transaction exists to avoid foreign key violations
  IF EXISTS (SELECT 1 FROM transactions WHERE id = p_transaction_id) THEN
    -- Insert with proper constraint handling
    INSERT INTO inventory_sync_audit (
      transaction_id,
      sync_status,
      error_details,
      items_processed,
      sync_duration_ms,
      affected_inventory_items,
      created_at
    ) VALUES (
      p_transaction_id,
      p_sync_status,
      p_error_details,
      p_items_processed,
      p_sync_duration_ms,
      p_affected_inventory_items,
      now()
    )
    ON CONFLICT (transaction_id) DO UPDATE SET
      sync_status = EXCLUDED.sync_status,
      error_details = EXCLUDED.error_details,
      items_processed = EXCLUDED.items_processed,
      sync_duration_ms = EXCLUDED.sync_duration_ms,
      affected_inventory_items = EXCLUDED.affected_inventory_items,
      created_at = EXCLUDED.created_at;
  ELSE
    -- Log a warning but don't fail - transaction might not exist yet or might be a test
    RAISE LOG 'Transaction % does not exist, skipping inventory sync audit', p_transaction_id;
  END IF;
EXCEPTION
  WHEN foreign_key_violation THEN
    -- Handle foreign key violations gracefully
    RAISE LOG 'Foreign key violation for transaction %, audit entry skipped', p_transaction_id;
  WHEN unique_violation THEN
    -- Handle unique constraint violations
    RAISE LOG 'Duplicate audit entry for transaction %, skipped', p_transaction_id;
  WHEN OTHERS THEN
    -- Handle any other database errors
    RAISE LOG 'Database error logging sync result for transaction %: %', p_transaction_id, SQLERRM;
END;
$function$;