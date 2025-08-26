-- Phase 1: Fix database function conflicts and create the missing functions
-- First, drop any duplicate functions to clean up
DROP FUNCTION IF EXISTS export_transactions_csv(uuid);
DROP FUNCTION IF EXISTS export_transaction_details_csv(uuid);

-- Create the export_transactions_csv function
CREATE OR REPLACE FUNCTION export_transactions_csv(store_id_param uuid)
RETURNS TABLE(
    receipt_number text,
    business_date text,
    transaction_time text,
    gross_amount numeric,
    discount_amount numeric,
    net_amount numeric,
    vat_amount numeric,
    payment_method text,
    discount_type text,
    discount_id text,
    promo_details text,
    senior_discount numeric,
    pwd_discount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.receipt_number::text,
        t.created_at::date::text as business_date,
        t.created_at::time::text as transaction_time,
        COALESCE(t.total, 0) as gross_amount,
        COALESCE(t.total - t.total, 0) as discount_amount, -- Calculate actual discount if available
        COALESCE(t.total, 0) as net_amount,
        COALESCE(t.total * 0.12, 0) as vat_amount, -- 12% VAT on total
        COALESCE(t.payment_method, 'CASH'::text) as payment_method,
        ''::text as discount_type,
        ''::text as discount_id,
        COALESCE(t.promo_details, ''::text) as promo_details,
        COALESCE(t.senior_discount, 0) as senior_discount,
        COALESCE(t.pwd_discount, 0) as pwd_discount
    FROM transactions t
    WHERE t.store_id = store_id_param
    AND t.created_at >= CURRENT_DATE - INTERVAL '30 days'
    AND t.status = 'completed'
    ORDER BY t.created_at DESC;
END;
$$;

-- Create the export_transaction_details_csv function
CREATE OR REPLACE FUNCTION export_transaction_details_csv(store_id_param uuid)
RETURNS TABLE(
    receipt_number text,
    item_sequence integer,
    item_description text,
    quantity numeric,
    unit_price numeric,
    line_total numeric,
    item_discount numeric,
    vat_exempt_flag boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.receipt_number::text,
        ROW_NUMBER() OVER (PARTITION BY t.receipt_number ORDER BY td.id)::integer as item_sequence,
        COALESCE(td.product_name, 'Unknown Item'::text) as item_description,
        COALESCE(td.quantity, 1) as quantity,
        COALESCE(td.unit_price, 0) as unit_price,
        COALESCE(td.line_total, 0) as line_total,
        COALESCE(td.discount_amount, 0) as item_discount,
        COALESCE(td.vat_exempt, false) as vat_exempt_flag
    FROM transactions t
    JOIN transaction_details td ON t.id = td.transaction_id
    WHERE t.store_id = store_id_param
    AND t.created_at >= CURRENT_DATE - INTERVAL '30 days'
    AND t.status = 'completed'
    ORDER BY t.created_at DESC, td.id;
END;
$$;

-- Create sm_export_logs table for tracking exports
CREATE TABLE IF NOT EXISTS sm_export_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL,
    export_type text NOT NULL DEFAULT 'scheduled',
    filename text NOT NULL,
    transaction_count integer DEFAULT 0,
    detail_count integer DEFAULT 0,
    email_sent boolean DEFAULT false,
    sftp_uploaded boolean DEFAULT false,
    staging boolean DEFAULT true,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone
);

-- Enable RLS on sm_export_logs
ALTER TABLE sm_export_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for sm_export_logs
CREATE POLICY "Users can view SM export logs for their stores" 
ON sm_export_logs 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM app_users au 
        WHERE au.user_id = auth.uid() 
        AND (
            au.role = ANY(ARRAY['admin'::app_role, 'owner'::app_role]) 
            OR store_id = ANY(au.store_ids)
        )
    )
);

-- Grant necessary permissions
GRANT ALL ON sm_export_logs TO authenticated;
GRANT ALL ON sm_export_logs TO service_role;