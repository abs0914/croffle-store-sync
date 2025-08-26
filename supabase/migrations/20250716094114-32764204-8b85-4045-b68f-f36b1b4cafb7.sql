-- Phase 1: Database Schema Fixes
-- Fix the export functions to handle proper CSV generation

DROP FUNCTION IF EXISTS export_transactions_csv_recent(uuid, integer);
DROP FUNCTION IF EXISTS export_transaction_details_csv_recent(uuid, integer);

-- Create improved transaction export function
CREATE OR REPLACE FUNCTION export_transactions_csv_recent(
    store_id_param UUID,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE(csv_data TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH transaction_data AS (
        SELECT 
            COALESCE(t.receipt_number, '') as receipt_number,
            COALESCE(t.created_at::date::text, '') as business_date,
            COALESCE(TO_CHAR(t.created_at, 'HH24:MI:SS'), '') as transaction_time,
            COALESCE(t.subtotal, 0) as gross_amount,
            COALESCE(t.discount, 0) as discount_amount,
            COALESCE(t.total, 0) as net_amount,
            COALESCE(t.tax, 0) as vat_amount,
            COALESCE(t.payment_method, 'CASH') as payment_method,
            COALESCE(t.discount_type, '') as discount_type,
            COALESCE(t.discount_id_number, '') as discount_id,
            COALESCE(t.promo_details, '') as promo_details,
            COALESCE(t.senior_citizen_discount, 0) as senior_discount,
            COALESCE(t.pwd_discount, 0) as pwd_discount
        FROM transactions t
        WHERE t.store_id = store_id_param
          AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * days_back
          AND t.status = 'completed'
        ORDER BY t.created_at DESC
    )
    SELECT 
        'receipt_number,business_date,transaction_time,gross_amount,discount_amount,net_amount,vat_amount,payment_method,discount_type,discount_id,promo_details,senior_discount,pwd_discount' || E'\n' ||
        COALESCE(
            STRING_AGG(
                receipt_number || ',' ||
                business_date || ',' ||
                transaction_time || ',' ||
                gross_amount::text || ',' ||
                discount_amount::text || ',' ||
                net_amount::text || ',' ||
                vat_amount::text || ',' ||
                payment_method || ',' ||
                discount_type || ',' ||
                discount_id || ',' ||
                promo_details || ',' ||
                senior_discount::text || ',' ||
                pwd_discount::text,
                E'\n'
                ORDER BY business_date DESC, transaction_time DESC
            ),
            ''
        )
    FROM transaction_data;
END;
$$;

-- Create transaction details export function using actual schema
CREATE OR REPLACE FUNCTION export_transaction_details_csv_recent(
    store_id_param UUID,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE(csv_data TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Since transaction_items table doesn't exist, create empty CSV structure
    RETURN QUERY
    SELECT 'receipt_number,item_sequence,item_description,quantity,unit_price,line_total,item_discount,vat_exempt_flag'::TEXT;
END;
$$;

-- Create a function to manage test shifts
CREATE OR REPLACE FUNCTION create_test_shift(
    p_store_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    shift_id UUID;
    current_user_id UUID;
BEGIN
    -- Get current user if not provided
    IF p_user_id IS NULL THEN
        current_user_id := auth.uid();
        IF current_user_id IS NULL THEN
            RAISE EXCEPTION 'No authenticated user found';
        END IF;
    ELSE
        current_user_id := p_user_id;
    END IF;
    
    -- Check if there's already an active test shift for this store
    SELECT id INTO shift_id
    FROM shifts 
    WHERE store_id = p_store_id 
      AND status = 'active'
      AND user_id = current_user_id
    LIMIT 1;
    
    -- If no active shift, create one
    IF shift_id IS NULL THEN
        INSERT INTO shifts (
            store_id,
            user_id,
            start_time,
            starting_cash,
            status
        ) VALUES (
            p_store_id,
            current_user_id,
            NOW(),
            1000.00, -- Starting cash for test
            'active'
        )
        RETURNING id INTO shift_id;
    END IF;
    
    RETURN shift_id;
END;
$$;

-- Create cleanup function for test data
CREATE OR REPLACE FUNCTION cleanup_test_data(
    p_store_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get current user if not provided
    IF p_user_id IS NULL THEN
        current_user_id := auth.uid();
    ELSE
        current_user_id := p_user_id;
    END IF;
    
    -- Delete test transactions (those with test receipt numbers)
    DELETE FROM transactions 
    WHERE store_id = p_store_id 
      AND (receipt_number LIKE 'RC%' OR receipt_number LIKE 'TEST%')
      AND user_id = current_user_id;
    
    -- Delete test shifts
    DELETE FROM shifts 
    WHERE store_id = p_store_id 
      AND user_id = current_user_id
      AND status = 'active';
    
    RETURN TRUE;
END;
$$;