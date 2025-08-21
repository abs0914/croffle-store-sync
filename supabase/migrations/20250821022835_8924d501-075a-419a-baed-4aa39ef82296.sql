-- Fix security issues from the previous migration

-- 1. Fix the function search path for get_inventory_items_by_category
DROP FUNCTION IF EXISTS get_inventory_items_by_category(UUID);

CREATE OR REPLACE FUNCTION get_inventory_items_by_category(store_id_param UUID)
RETURNS TABLE(
  id UUID,
  item TEXT,
  unit TEXT,
  item_category TEXT,
  stock_quantity INTEGER,
  cost NUMERIC
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    inv.id,
    inv.item,
    inv.unit,
    inv.item_category::TEXT,
    inv.stock_quantity,
    inv.cost
  FROM inventory_stock inv
  WHERE inv.store_id = store_id_param
    AND inv.is_active = true
  ORDER BY 
    inv.item_category,
    inv.item;
END;
$$;