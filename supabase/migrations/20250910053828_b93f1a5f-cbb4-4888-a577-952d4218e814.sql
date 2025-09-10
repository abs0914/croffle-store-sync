-- Create a function to safely insert inventory movements with proper UUID handling
CREATE OR REPLACE FUNCTION insert_inventory_movement_safe(
  p_inventory_stock_id uuid,
  p_movement_type text,
  p_quantity_change numeric,
  p_previous_quantity numeric,
  p_new_quantity numeric,
  p_reference_type text,
  p_reference_id text,
  p_notes text DEFAULT NULL,
  p_created_by text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  movement_id uuid;
BEGIN
  -- Insert the inventory movement with proper UUID casting
  INSERT INTO inventory_movements (
    inventory_stock_id,
    movement_type,
    quantity_change,
    previous_quantity,
    new_quantity,
    reference_type,
    reference_id,
    notes,
    created_by
  ) VALUES (
    p_inventory_stock_id,
    p_movement_type::inventory_movement_type,
    p_quantity_change,
    p_previous_quantity,
    p_new_quantity,
    p_reference_type::inventory_reference_type,
    p_reference_id::uuid,  -- Explicit UUID casting
    p_notes,
    CASE 
      WHEN p_created_by IS NOT NULL AND p_created_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
      THEN p_created_by::uuid 
      ELSE NULL 
    END
  ) RETURNING id INTO movement_id;
  
  RETURN movement_id;
END;
$$;