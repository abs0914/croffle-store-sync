-- Update export_transactions_csv function to work with existing table structure
CREATE OR REPLACE FUNCTION public.export_transactions_csv(store_id_param uuid DEFAULT NULL, days_back integer DEFAULT 30)
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
AS $function$
DECLARE
  start_date TIMESTAMP;
BEGIN
  -- Calculate start date
  start_date := NOW() - INTERVAL '1 day' * days_back;
  
  RETURN QUERY
  SELECT 
    t.receipt_number::TEXT,
    DATE(t.created_at)::TEXT as business_date,
    TO_CHAR(t.created_at, 'HH24:MI:SS')::TEXT as transaction_time,
    COALESCE(t.total, 0)::NUMERIC as gross_amount,
    COALESCE(t.discount, 0)::NUMERIC as discount_amount,
    (COALESCE(t.total, 0) - COALESCE(t.discount, 0))::NUMERIC as net_amount,
    COALESCE(t.tax, 0)::NUMERIC as vat_amount,
    COALESCE(t.payment_method, 'CASH')::TEXT as payment_method,
    CASE 
      WHEN COALESCE(t.senior_citizen_discount, 0) > 0 THEN 'SENIOR'
      WHEN COALESCE(t.pwd_discount, 0) > 0 THEN 'PWD'
      WHEN COALESCE(t.discount_type, '') != '' THEN UPPER(t.discount_type::TEXT)
      ELSE ''
    END::TEXT as discount_type,
    CASE 
      WHEN COALESCE(t.senior_citizen_discount, 0) > 0 OR COALESCE(t.pwd_discount, 0) > 0 OR COALESCE(t.discount_type, '') != ''
      THEN COALESCE(t.discount_id_number, t.receipt_number)::TEXT
      ELSE ''
    END as discount_id,
    COALESCE(t.promo_details, '')::TEXT as promo_details,
    COALESCE(t.senior_citizen_discount, 0)::NUMERIC as senior_discount,
    COALESCE(t.pwd_discount, 0)::NUMERIC as pwd_discount
  FROM transactions t
  WHERE t.created_at >= start_date
    AND t.status = 'completed'
    AND (store_id_param IS NULL OR t.store_id = store_id_param)
  ORDER BY t.created_at ASC;
END;
$function$;

-- Update export_transaction_details_csv function to work with JSONB items
CREATE OR REPLACE FUNCTION public.export_transaction_details_csv(store_id_param uuid DEFAULT NULL, days_back integer DEFAULT 30)
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
AS $function$
DECLARE
  start_date TIMESTAMP;
BEGIN
  -- Calculate start date
  start_date := NOW() - INTERVAL '1 day' * days_back;
  
  RETURN QUERY
  SELECT 
    t.receipt_number::TEXT,
    (row_number() OVER (PARTITION BY t.receipt_number ORDER BY (item_data->>'name')))::INTEGER as item_sequence,
    COALESCE(item_data->>'name', 'Unknown Item')::TEXT as item_description,
    COALESCE((item_data->>'quantity')::NUMERIC, 1) as quantity,
    COALESCE((item_data->>'price')::NUMERIC, 0) as unit_price,
    COALESCE((item_data->>'total')::NUMERIC, (item_data->>'quantity')::NUMERIC * (item_data->>'price')::NUMERIC, 0) as line_total,
    COALESCE((item_data->>'discount')::NUMERIC, 0) as item_discount,
    COALESCE(t.vat_exempt_sales > 0, false) as vat_exempt_flag
  FROM transactions t
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE 
      WHEN jsonb_typeof(t.items) = 'array' THEN t.items
      ELSE '[]'::jsonb
    END
  ) AS item_data
  WHERE t.created_at >= start_date
    AND t.status = 'completed'
    AND (store_id_param IS NULL OR t.store_id = store_id_param)
  ORDER BY t.created_at ASC, item_sequence ASC;
END;
$function$;