-- Create function to get low stock items safely
CREATE OR REPLACE FUNCTION public.get_low_stock_items(store_id_param uuid)
RETURNS TABLE(
  id uuid,
  store_id uuid,
  item text,
  unit text,
  stock_quantity integer,
  minimum_threshold integer,
  maximum_capacity integer,
  cost numeric,
  is_active boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    inv.id,
    inv.store_id,
    inv.item,
    inv.unit,
    inv.stock_quantity,
    inv.minimum_threshold,
    inv.maximum_capacity,
    inv.cost,
    inv.is_active,
    inv.created_at,
    inv.updated_at
  FROM inventory_stock inv
  WHERE inv.store_id = store_id_param
    AND inv.is_active = true
    AND inv.stock_quantity < COALESCE(inv.minimum_threshold, 10);
END;
$function$;