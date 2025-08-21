-- Fix the get_inventory_items_by_category function return type mismatch
DROP FUNCTION IF EXISTS public.get_inventory_items_by_category(uuid);

CREATE OR REPLACE FUNCTION public.get_inventory_items_by_category(store_id_param uuid)
 RETURNS TABLE(id uuid, item text, unit text, item_category text, stock_quantity integer, cost numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    inv.id,
    inv.item,
    inv.unit,
    inv.item_category::TEXT,
    inv.stock_quantity::integer,  -- Cast to integer to match expected type
    inv.cost
  FROM inventory_stock inv
  WHERE inv.store_id = store_id_param
    AND inv.is_active = true
  ORDER BY 
    inv.item_category,
    inv.item;
END;
$function$;