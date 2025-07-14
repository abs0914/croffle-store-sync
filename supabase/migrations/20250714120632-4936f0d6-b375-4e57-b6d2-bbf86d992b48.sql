-- Update SM Accreditation functions to support store-specific filtering

-- Update export_transactions_csv function to accept store_id parameter
CREATE OR REPLACE FUNCTION public.export_transactions_csv(
  store_id_param UUID DEFAULT NULL,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
  receipt_number TEXT,
  business_date TEXT,
  transaction_time TEXT,
  gross_amount NUMERIC,
  discount_amount NUMERIC,
  net_amount NUMERIC,
  vat_amount NUMERIC,
  payment_method TEXT,
  discount_type TEXT,
  discount_id TEXT,
  promo_details TEXT,
  senior_discount NUMERIC,
  pwd_discount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    COALESCE(t.discount_amount, 0)::NUMERIC as discount_amount,
    (COALESCE(t.total, 0) - COALESCE(t.discount_amount, 0))::NUMERIC as net_amount,
    COALESCE(t.vat_amount, 0)::NUMERIC as vat_amount,
    COALESCE(t.payment_method, 'CASH')::TEXT as payment_method,
    CASE 
      WHEN COALESCE(t.senior_discount, 0) > 0 THEN 'SENIOR'
      WHEN COALESCE(t.pwd_discount, 0) > 0 THEN 'PWD'
      ELSE ''
    END::TEXT as discount_type,
    CASE 
      WHEN COALESCE(t.senior_discount, 0) > 0 OR COALESCE(t.pwd_discount, 0) > 0 
      THEN t.receipt_number::TEXT
      ELSE ''
    END as discount_id,
    COALESCE(t.promo_details, '')::TEXT as promo_details,
    COALESCE(t.senior_discount, 0)::NUMERIC as senior_discount,
    COALESCE(t.pwd_discount, 0)::NUMERIC as pwd_discount
  FROM transactions t
  WHERE t.created_at >= start_date
    AND t.status = 'completed'
    AND (store_id_param IS NULL OR t.store_id = store_id_param)
  ORDER BY t.created_at ASC;
END;
$$;

-- Update export_transaction_details_csv function to accept store_id parameter
CREATE OR REPLACE FUNCTION public.export_transaction_details_csv(
  store_id_param UUID DEFAULT NULL,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
  receipt_number TEXT,
  item_sequence INTEGER,
  item_description TEXT,
  quantity NUMERIC,
  unit_price NUMERIC,
  line_total NUMERIC,
  item_discount NUMERIC,
  vat_exempt_flag BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_date TIMESTAMP;
BEGIN
  -- Calculate start date
  start_date := NOW() - INTERVAL '1 day' * days_back;
  
  RETURN QUERY
  SELECT 
    t.receipt_number::TEXT,
    ROW_NUMBER() OVER (PARTITION BY t.receipt_number ORDER BY ti.created_at)::INTEGER as item_sequence,
    COALESCE(pc.product_name, p.name, 'Unknown Item')::TEXT as item_description,
    ti.quantity::NUMERIC,
    ti.unit_price::NUMERIC,
    (ti.quantity * ti.unit_price)::NUMERIC as line_total,
    COALESCE(ti.discount_amount, 0)::NUMERIC as item_discount,
    COALESCE(ti.is_vat_exempt, false)::BOOLEAN as vat_exempt_flag
  FROM transactions t
  JOIN transaction_items ti ON t.id = ti.transaction_id
  LEFT JOIN product_catalog pc ON ti.product_catalog_id = pc.id
  LEFT JOIN products p ON ti.product_id = p.id
  WHERE t.created_at >= start_date
    AND t.status = 'completed'
    AND (store_id_param IS NULL OR t.store_id = store_id_param)
  ORDER BY t.created_at ASC, item_sequence ASC;
END;
$$;