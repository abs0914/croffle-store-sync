-- Generate sequential purchase order numbers per day
CREATE OR REPLACE FUNCTION public.generate_purchase_order_number()
RETURNS text
LANGUAGE plpgsql
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

-- Trigger to auto-set purchase order number on insert
CREATE OR REPLACE FUNCTION public.set_purchase_order_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := public.generate_purchase_order_number();
  END IF;
  RETURN NEW;
END;
$$;

-- Ensure trigger is present on purchase_orders
DROP TRIGGER IF EXISTS set_purchase_order_number_trg ON public.purchase_orders;
CREATE TRIGGER set_purchase_order_number_trg
BEFORE INSERT ON public.purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_purchase_order_number();