-- Clear store_metrics data for Sugbo Mercado to show real zero values
-- since we cleared the underlying transaction data

-- Log what we're about to delete
DO $$
DECLARE
    metrics_record record;
BEGIN
    -- Log the existing metrics data before deletion
    FOR metrics_record IN 
        SELECT * FROM store_metrics 
        WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
    LOOP
        INSERT INTO data_cleanup_log (
            cleanup_action,
            table_name,
            record_details,
            created_at
        ) VALUES (
            'clear_store_metrics',
            'store_metrics',
            jsonb_build_object(
                'id', metrics_record.id,
                'store_id', metrics_record.store_id,
                'metric_date', metrics_record.metric_date,
                'total_sales', metrics_record.total_sales,
                'total_orders', metrics_record.total_orders,
                'average_order_value', metrics_record.average_order_value
            ),
            now()
        );
    END LOOP;
END $$;

-- Delete store_metrics data for Sugbo Mercado store
DELETE FROM store_metrics 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Log completion
INSERT INTO data_cleanup_log (
    cleanup_action,
    table_name,
    record_details,
    created_at
) VALUES (
    'clear_store_metrics_completed',
    'store_metrics',
    jsonb_build_object(
        'store_id', 'd7c47e6b-f20a-4543-a6bd-000398f72df5',
        'message', 'Successfully cleared all store metrics data to show real zero values'
    ),
    now()
);