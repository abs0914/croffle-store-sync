-- Harden newly added functions by setting search_path
CREATE OR REPLACE FUNCTION public.generate_purchase_order_number()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  order_count INTEGER;
  order_number TEXT;
BEGIN
  SELECT COUNT(*) INTO order_count
  FROM public.purchase_orders
  WHERE DATE(created_at) = CURRENT_DATE;
  
  order_number := 'PO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD((order_count + 1)::TEXT, 3, '0');
  RETURN order_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_purchase_order_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := public.generate_purchase_order_number();
  END IF;
  RETURN NEW;
END;
$$;