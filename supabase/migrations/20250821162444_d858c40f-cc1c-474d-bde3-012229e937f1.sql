-- Fix log_inventory_sync_result function to handle conflicts gracefully
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
AS $function$
BEGIN
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
    ON CONFLICT (transaction_id) DO NOTHING;
END;
$function$