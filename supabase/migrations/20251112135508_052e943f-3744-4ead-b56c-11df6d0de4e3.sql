-- Fix race condition in purchase order number generation
-- This function now checks for existing order numbers and increments until unique

CREATE OR REPLACE FUNCTION public.generate_purchase_order_number()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  order_number TEXT;
  order_count INTEGER;
  max_attempts INTEGER := 100;
  attempt INTEGER := 0;
BEGIN
  LOOP
    -- Get current count of orders for today
    SELECT COUNT(*) INTO order_count
    FROM public.purchase_orders
    WHERE DATE(created_at) = CURRENT_DATE;
    
    -- Generate order number
    order_number := 'PO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD((order_count + 1 + attempt)::TEXT, 3, '0');
    
    -- Check if this order number already exists
    IF NOT EXISTS (
      SELECT 1 FROM public.purchase_orders WHERE order_number = order_number
    ) THEN
      RETURN order_number;
    END IF;
    
    -- If we get here, the order number exists, so try again
    attempt := attempt + 1;
    
    -- Safety check to prevent infinite loops
    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique order number after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$function$;