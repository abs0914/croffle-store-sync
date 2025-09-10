-- Fix UUID casting in insert_inventory_movement_safe function
CREATE OR REPLACE FUNCTION public.insert_inventory_movement_safe(
    p_inventory_stock_id uuid,
    p_movement_type text,
    p_quantity_change numeric,
    p_previous_quantity numeric,
    p_new_quantity numeric,
    p_reference_type text,
    p_reference_id text,  -- Accept as text first
    p_notes text,
    p_created_by text     -- Accept as text first
) RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    validated_reference_id uuid;
    validated_created_by uuid;
BEGIN
    -- Validate and cast reference_id if provided
    IF p_reference_id IS NOT NULL AND p_reference_id != '' THEN
        -- Check if it's a valid UUID format
        BEGIN
            validated_reference_id := p_reference_id::uuid;
        EXCEPTION WHEN invalid_text_representation THEN
            -- If not a valid UUID, log warning and set to null
            RAISE WARNING 'Invalid UUID format for reference_id: %', p_reference_id;
            validated_reference_id := NULL;
        END;
    ELSE
        validated_reference_id := NULL;
    END IF;
    
    -- Validate and cast created_by if provided
    IF p_created_by IS NOT NULL AND p_created_by != '' THEN
        -- Check if it's a valid UUID format
        BEGIN
            validated_created_by := p_created_by::uuid;
        EXCEPTION WHEN invalid_text_representation THEN
            -- If not a valid UUID, use a default system UUID
            validated_created_by := NULL;
        END;
    ELSE
        validated_created_by := NULL;
    END IF;

    -- Insert the inventory movement record with validated UUIDs
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
        validated_reference_id,
        p_notes,
        validated_created_by,
        NOW()
    );
END;
$function$;