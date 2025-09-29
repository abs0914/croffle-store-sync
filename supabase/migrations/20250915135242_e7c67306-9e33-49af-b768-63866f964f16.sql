-- Fix the insert_inventory_movement_safe function to handle NULL created_by
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
DECLARE
  v_created_by uuid;
BEGIN
  -- Handle NULL created_by by using auth.uid() or a system user
  v_created_by := COALESCE(
    p_created_by, 
    auth.uid(), 
    (SELECT id FROM auth.users WHERE email = 'system@internal.com' LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  );
  
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
    v_created_by,
    NOW()
  );
  
  -- Log success for debugging
  RAISE NOTICE 'Successfully inserted inventory movement for stock_id: % with user: %', p_inventory_stock_id, v_created_by;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the transaction
    RAISE WARNING 'Failed to insert inventory movement for stock_id %: %', p_inventory_stock_id, SQLERRM;
    -- Re-raise the exception so calling code can handle it
    RAISE;
END;
$$;