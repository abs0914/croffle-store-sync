-- Fix function overloading conflicts by dropping all versions and recreating with unique names

-- Drop all existing export functions
DROP FUNCTION IF EXISTS public.export_transactions_csv(uuid);
DROP FUNCTION IF EXISTS public.export_transactions_csv(uuid, integer);
DROP FUNCTION IF EXISTS public.export_transaction_details_csv(uuid);
DROP FUNCTION IF EXISTS public.export_transaction_details_csv(uuid, integer);

-- Create the functions with proper unique signatures
CREATE OR REPLACE FUNCTION public.export_transactions_csv_recent(store_id_param uuid, days_back integer DEFAULT 30)
RETURNS TABLE(
  csv_data text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    string_agg(
      concat_ws(',',
        quote_literal(COALESCE(t.receipt_number, '')),
        quote_literal(TO_CHAR(t.created_at, 'MM/DD/YYYY')),
        quote_literal(TO_CHAR(t.created_at, 'HH24:MI:SS')),
        COALESCE(t.total, 0)::text,
        quote_literal(COALESCE(t.payment_method, 'CASH')),
        quote_literal(COALESCE(t.cashier_name, '')),
        quote_literal(COALESCE(t.terminal_id, 'TERMINAL-01'))
      ),
      E'\n'
    ) as csv_data
  FROM transactions t
  WHERE t.store_id = store_id_param 
    AND t.created_at >= CURRENT_DATE - INTERVAL '%s days' % days_back
    AND t.status = 'completed'
  GROUP BY store_id_param
  HAVING COUNT(*) > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.export_transaction_details_csv_recent(store_id_param uuid, days_back integer DEFAULT 30)
RETURNS TABLE(
  csv_data text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    string_agg(
      concat_ws(',',
        quote_literal(COALESCE(t.receipt_number, '')),
        quote_literal(COALESCE(ti.product_name, '')),
        COALESCE(ti.quantity, 0)::text,
        COALESCE(ti.price, 0)::text,
        COALESCE(ti.total, 0)::text,
        quote_literal(COALESCE(ti.category, '')),
        quote_literal(TO_CHAR(t.created_at, 'MM/DD/YYYY'))
      ),
      E'\n'
    ) as csv_data
  FROM transactions t
  JOIN transaction_items ti ON t.id = ti.transaction_id
  WHERE t.store_id = store_id_param 
    AND t.created_at >= CURRENT_DATE - INTERVAL '%s days' % days_back
    AND t.status = 'completed'
  GROUP BY store_id_param
  HAVING COUNT(*) > 0;
END;
$$;