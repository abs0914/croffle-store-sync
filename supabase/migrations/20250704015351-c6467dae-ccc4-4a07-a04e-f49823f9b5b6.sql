-- Fix ambiguous column reference in update_store_metrics function
CREATE OR REPLACE FUNCTION public.update_store_metrics()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  current_date DATE := CURRENT_DATE;
BEGIN
  -- Update or insert daily metrics with proper table qualification
  INSERT INTO public.store_metrics (
    store_id, metric_date, total_sales, total_orders, average_order_value
  )
  SELECT 
    NEW.store_id,
    current_date,
    COALESCE(SUM(t.total), 0),
    COUNT(*),
    COALESCE(AVG(t.total), 0)
  FROM public.transactions t
  WHERE t.store_id = NEW.store_id 
    AND DATE(t.created_at) = current_date
    AND t.status = 'completed'
  ON CONFLICT (store_id, metric_date) 
  DO UPDATE SET
    total_sales = EXCLUDED.total_sales,
    total_orders = EXCLUDED.total_orders,
    average_order_value = EXCLUDED.average_order_value,
    updated_at = NOW();
    
  RETURN NEW;
END;
$function$;