-- Update the export_transaction_details_csv_recent function to export actual data
CREATE OR REPLACE FUNCTION public.export_transaction_details_csv_recent(store_id_param uuid, days_back integer DEFAULT 30)
 RETURNS TABLE(csv_data text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
BEGIN
    RETURN QUERY
    WITH transaction_details AS (
        SELECT 
            COALESCE(t.receipt_number, '') as receipt_number,
            ROW_NUMBER() OVER (PARTITION BY t.id ORDER BY ti.created_at) as item_sequence,
            COALESCE(ti.name, '') as item_description,
            COALESCE(ti.quantity, 0) as quantity,
            COALESCE(ti.unit_price, 0) as unit_price,
            COALESCE(ti.total_price, 0) as line_total,
            0 as item_discount, -- Default to 0 for now
            CASE WHEN ti.product_type = 'vat_exempt' THEN 'Y' ELSE 'N' END as vat_exempt_flag
        FROM transactions t
        JOIN transaction_items ti ON t.id = ti.transaction_id
        WHERE t.store_id = store_id_param
          AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * days_back
          AND t.status = 'completed'
        ORDER BY t.created_at DESC, ti.created_at ASC
    )
    SELECT 
        'receipt_number,item_sequence,item_description,quantity,unit_price,line_total,item_discount,vat_exempt_flag' || E'\n' ||
        COALESCE(
            STRING_AGG(
                receipt_number || ',' ||
                item_sequence::text || ',' ||
                item_description || ',' ||
                quantity::text || ',' ||
                unit_price::text || ',' ||
                line_total::text || ',' ||
                item_discount::text || ',' ||
                vat_exempt_flag,
                E'\n'
                ORDER BY receipt_number, item_sequence
            ),
            ''
        )
    FROM transaction_details;
END;
$function$