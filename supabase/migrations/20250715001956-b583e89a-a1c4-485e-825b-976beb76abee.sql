-- Fix SM Accreditation export functions to use correct fields for gross_amount and other calculations

-- Update export_transactions_csv function to use subtotal for gross_amount
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
    -- FIX: Use subtotal for gross_amount (amount before discounts)
    COALESCE(t.subtotal, 0)::NUMERIC as gross_amount,
    -- FIX: Use discount field for total discount amount
    COALESCE(t.discount, 0)::NUMERIC as discount_amount,
    -- Net amount is total (amount after discounts)
    COALESCE(t.total, 0)::NUMERIC as net_amount,
    -- Use tax field for VAT amount
    COALESCE(t.tax, 0)::NUMERIC as vat_amount,
    COALESCE(t.payment_method, 'CASH')::TEXT as payment_method,
    CASE 
      WHEN COALESCE(t.senior_citizen_discount, 0) > 0 THEN 'SENIOR'
      WHEN COALESCE(t.pwd_discount, 0) > 0 THEN 'PWD'
      WHEN t.discount_type IS NOT NULL THEN t.discount_type
      ELSE ''
    END::TEXT as discount_type,
    CASE 
      WHEN COALESCE(t.senior_citizen_discount, 0) > 0 OR COALESCE(t.pwd_discount, 0) > 0 
      THEN COALESCE(t.discount_id_number, t.receipt_number)::TEXT
      ELSE COALESCE(t.discount_id_number, '')::TEXT
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
$$;