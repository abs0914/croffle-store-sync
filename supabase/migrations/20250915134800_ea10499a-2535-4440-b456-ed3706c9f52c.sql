-- Create the missing insert_inventory_movement_safe database function
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
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert inventory movement record with proper error handling
  INSERT INTO public.inventory_movements (
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
    COALESCE(p_notes, ''),
    p_created_by,
    NOW()
  );
  
  -- Log success for debugging
  RAISE NOTICE 'Successfully inserted inventory movement for stock_id: %', p_inventory_stock_id;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the transaction
    RAISE WARNING 'Failed to insert inventory movement for stock_id %: %', p_inventory_stock_id, SQLERRM;
    -- Re-raise the exception so calling code can handle it
    RAISE;
END;
$$;