-- Fix conflicting insert_inventory_movement_safe functions
-- Drop all existing versions to resolve the conflict

DROP FUNCTION IF EXISTS public.insert_inventory_movement_safe(
  p_inventory_stock_id uuid,
  p_movement_type text,
  p_quantity_change numeric,
  p_previous_quantity numeric,
  p_new_quantity numeric,
  p_reference_type text,
  p_reference_id text,
  p_notes text,
  p_created_by text
);

DROP FUNCTION IF EXISTS public.insert_inventory_movement_safe(
  p_inventory_stock_id uuid,
  p_movement_type text,
  p_quantity_change numeric,
  p_previous_quantity numeric,
  p_new_quantity numeric,
  p_reference_type text,
  p_reference_id uuid,
  p_notes text,
  p_created_by uuid
);

-- Create the correct single version with proper UUID types
CREATE OR REPLACE FUNCTION public.insert_inventory_movement_safe(
  p_inventory_stock_id uuid,
  p_movement_type text,
  p_quantity_change numeric,
  p_previous_quantity numeric,
  p_new_quantity numeric,
  p_reference_type text,
  p_reference_id uuid,
  p_notes text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert inventory movement record
  INSERT INTO inventory_movements (
    inventory_stock_id,
    movement_type,
    quantity_change,
    previous_quantity,
    new_quantity,
    reference_type,
    reference_id,
    notes,
    created_by,
    created_at
  ) VALUES (
    p_inventory_stock_id,
    p_movement_type,
    p_quantity_change,
    p_previous_quantity,
    p_new_quantity,
    p_reference_type,
    p_reference_id,
    p_notes,
    p_created_by,
    NOW()
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the transaction
    RAISE WARNING 'Failed to insert inventory movement: %', SQLERRM;
END;
$$;