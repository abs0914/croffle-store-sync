-- Phase 2 Optimization: Batch Inventory Update Function
-- This function allows updating multiple inventory stock items in a single operation
-- Reduces N+1 query problem from 18+ queries to 1 query

CREATE OR REPLACE FUNCTION batch_update_inventory_stock(p_updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  update_record jsonb;
BEGIN
  -- Loop through each update record
  FOR update_record IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    UPDATE inventory_stock
    SET 
      stock_quantity = (update_record->>'new_quantity')::numeric,
      updated_at = now()
    WHERE id = (update_record->>'id')::uuid;
  END LOOP;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION batch_update_inventory_stock IS 'Batch update inventory stock quantities for transaction processing optimization';
