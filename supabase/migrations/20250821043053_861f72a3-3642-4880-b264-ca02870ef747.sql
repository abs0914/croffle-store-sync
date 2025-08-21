-- Update log_inventory_sync_result function to accept affected_inventory_items parameter
CREATE OR REPLACE FUNCTION public.log_inventory_sync_result(
  p_transaction_id uuid,
  p_sync_status text,
  p_error_details text DEFAULT NULL::text,
  p_items_processed integer DEFAULT 0,
  p_sync_duration_ms integer DEFAULT NULL::integer,
  p_affected_inventory_items jsonb DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  INSERT INTO public.inventory_sync_audit (
    transaction_id,
    sync_status,
    error_details,
    items_processed,
    sync_duration_ms,
    affected_inventory_items
  ) VALUES (
    p_transaction_id,
    p_sync_status,
    p_error_details,
    p_items_processed,
    p_sync_duration_ms,
    p_affected_inventory_items
  )
  ON CONFLICT (transaction_id)
  DO UPDATE SET
    sync_status = EXCLUDED.sync_status,
    error_details = EXCLUDED.error_details,
    items_processed = EXCLUDED.items_processed,
    sync_duration_ms = EXCLUDED.sync_duration_ms,
    affected_inventory_items = EXCLUDED.affected_inventory_items,
    created_at = NOW();
END;
$function$;