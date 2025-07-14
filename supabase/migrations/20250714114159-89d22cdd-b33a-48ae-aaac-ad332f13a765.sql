-- Add promo reference tracking to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS promo_reference TEXT,
ADD COLUMN IF NOT EXISTS promo_details TEXT;

-- Create function to format promo details 
CREATE OR REPLACE FUNCTION public.format_promo_details(promo_ref TEXT, promo_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  IF promo_ref IS NULL OR promo_name IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN promo_ref || '=' || promo_name;
END;
$$;

-- Create CSV export functions for SM Accreditation
CREATE OR REPLACE FUNCTION public.export_transactions_csv(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  receipt_number TEXT,
  business_date DATE,
  transaction_time TIME,
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
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.receipt_number::TEXT,
    t.created_at::DATE as business_date,
    t.created_at::TIME as transaction_time,
    (t.subtotal + t.tax) as gross_amount,
    t.discount,
    t.total as net_amount,
    t.tax as vat_amount,
    t.payment_method::TEXT,
    t.discount_type::TEXT,
    t.discount_id_number as discount_id,
    t.promo_details,
    CASE WHEN t.discount_type = 'senior' THEN t.discount ELSE 0 END as senior_discount,
    CASE WHEN t.discount_type = 'pwd' THEN t.discount ELSE 0 END as pwd_discount
  FROM public.transactions t
  WHERE t.created_at::DATE BETWEEN start_date AND end_date
    AND t.status = 'completed'
  ORDER BY t.created_at;
END;
$$;

-- Create transaction details export function
CREATE OR REPLACE FUNCTION public.export_transaction_details_csv(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  receipt_number TEXT,
  item_sequence INTEGER,
  item_description TEXT,
  quantity INTEGER,
  unit_price NUMERIC,
  line_total NUMERIC,
  item_discount NUMERIC,
  vat_exempt_flag BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.receipt_number::TEXT,
    ROW_NUMBER() OVER (PARTITION BY t.receipt_number ORDER BY ti.product_id)::INTEGER as item_sequence,
    ti.name::TEXT as item_description,
    ti.quantity,
    ti.unit_price,
    ti.total_price as line_total,
    0::NUMERIC as item_discount, -- Default to 0, can be enhanced later
    CASE WHEN t.vat_exempt_sales > 0 THEN true ELSE false END as vat_exempt_flag
  FROM public.transactions t
  JOIN LATERAL jsonb_to_recordset(
    CASE 
      WHEN jsonb_typeof(t.items) = 'array' THEN t.items
      ELSE '[]'::jsonb
    END
  ) AS ti(product_id TEXT, name TEXT, quantity INTEGER, unit_price NUMERIC, total_price NUMERIC) ON true
  WHERE t.created_at::DATE BETWEEN start_date AND end_date
    AND t.status = 'completed'
  ORDER BY t.created_at, item_sequence;
END;
$$;