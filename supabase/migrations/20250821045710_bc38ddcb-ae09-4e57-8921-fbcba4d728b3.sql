-- Fix function overloading issue by dropping and recreating the correct version
DROP FUNCTION IF EXISTS log_inventory_sync_result(uuid, text, text, integer, integer);
DROP FUNCTION IF EXISTS log_inventory_sync_result(uuid, text, text, integer, integer, jsonb);

-- Create the unified function that handles both cases
CREATE OR REPLACE FUNCTION log_inventory_sync_result(
    p_transaction_id uuid,
    p_sync_status text,
    p_error_details text DEFAULT NULL,
    p_items_processed integer DEFAULT 0,
    p_sync_duration_ms integer DEFAULT 0,
    p_affected_inventory_items jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    );
END;
$$;